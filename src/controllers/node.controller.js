import axios from 'axios'; // Needed for Beaconcha.in check
import Stripe from 'stripe';
import NodeServer from '../models/NodeServer.js';
import Validator from '../models/Validator.js';
import Command from '../models/Command.js';
import Customer from '../models/Customer.js';
import Site from '../models/Site.js';
import NodeOrder from '../models/NodeOrder.js';
import logger from '../utils/logger.js';
import { sendTelegramAlert } from '../services/telegram.service.js';

// --- PUBLIC / USER ENDPOINTS ---

// Network configuration for different chains
const NETWORK_CONFIG = {
  ethereum: {
    apiUrl: 'https://beaconcha.in/api/v1',
    ticker: 'ETH',
    stakeAmount: 32
  },
  lukso: {
    apiUrl: 'https://explorer.consensus.mainnet.lukso.network/api/v1',
    ticker: 'LYX',
    stakeAmount: 32
  },
  gnosis: {
    apiUrl: 'https://gnosischa.in/api/v1',
    ticker: 'GNO',
    stakeAmount: 1
  }
};

// Add a Validator (User Action)
export const addValidator = async (req, res) => {
  try {
    const { input, network = 'ethereum' } = req.body; // input = index or pubkey
    
    if (!input) {
      return res.status(400).json({ success: false, message: 'Input is required' });
    }

    // Normalize network name
    const normalizedNetwork = network.toLowerCase();
    const networkConfig = NETWORK_CONFIG[normalizedNetwork];
    
    if (!networkConfig) {
      return res.status(400).json({ success: false, message: `Unsupported network: ${network}` });
    }

    // 1. Verify on appropriate beacon explorer
    const baseUrl = networkConfig.apiUrl;
    
    try {
      const response = await axios.get(`${baseUrl}/validator/${input}`);
      const data = response.data.data;

      if (!data) {
         return res.status(404).json({ success: false, message: 'Validator not found on chain' });
      }

      // Normalize (Beaconcha returns array if multiple, object if single, but /validator/:id usually object or array of 1)
      const validatorData = Array.isArray(data) ? data[0] : data;
      
      // 2. Find a default NodeServer for this user (For now, pick the first one or a specific default)
      const defaultServer = await NodeServer.findOne(); // Just take the first one in DB for this MVP context
      
      if (!defaultServer) {
        return res.status(500).json({ success: false, message: 'No Node Server configured in backend' });
      }

      // 3. Create or Update Validator in DB
      const newValidator = await Validator.findOneAndUpdate(
        { publicKey: validatorData.pubkey },
        {
          publicKey: validatorData.pubkey,
          index: validatorData.validatorindex,
          name: `Validator ${validatorData.validatorindex}`,
          network: normalizedNetwork,
          user: req.user._id,
          server: defaultServer._id,
          status: validatorData.status,
          balance: validatorData.balance / 1e9,
          effectiveBalance: validatorData.effectivebalance / 1e9,
          activationEpoch: validatorData.activationepoch,
          exitEpoch: validatorData.exitepoch,
          slashed: validatorData.slashed
        },
        { upsert: true, new: true }
      );

      res.json({ success: true, data: newValidator });

    } catch (apiError) {
      console.error(`${normalizedNetwork} Explorer Error:`, apiError.message);
      return res.status(404).json({ success: false, message: `Validator check failed on ${network} (Invalid Index/Pubkey?)` });
    }

  } catch (error) {
    logger.error('Add Validator Error:', error);
    res.status(500).json({ success: false, message: 'Failed to add validator' });
  }
};

// Get Dashboard Data for User
export const getUserDashboard = async (req, res) => {
  try {
    logger.info(`📊 Dashboard for User ${req.user._id} - Telegram ID: ${req.user.telegramUserId}`);
    
    // Find validators belonging to this user
    const validators = await Validator.find({ user: req.user._id })
      .select('-withdrawalCredentials') // Security
      .populate('server', 'name status');

    // Calculate aggregates
    const totalStaked = validators.reduce((acc, val) => acc + (val.effectiveBalance || 0), 0);
    const totalRewards = validators.reduce((acc, val) => acc + (val.rewards?.total || 0), 0);
    // Avoid division by zero and Fix 10000% bug
    const avgEffectiveness = validators.length > 0 
      ? validators.reduce((acc, val) => {
          let eff = val.performance?.attestationEffectiveness || 0;
          // Normalize to 0.0-1.0 range
          if (eff > 100) eff = eff / 10000; // e.g. 10000 (basis points) -> 1.0
          else if (eff > 1) eff = eff / 100; // e.g. 98.5 -> 0.985
          return acc + eff;
        }, 0) / validators.length
      : 0;

    res.json({
      success: true,
      data: {
        validators,
        stats: {
          totalStaked,
          totalRewards,
          avgEffectiveness,
          validatorCount: validators.length
        },
        user: {
           telegramUserId: req.user.telegramUserId,
           preferences: req.user.preferences
        }
      }
    });
  } catch (error) {
    logger.error('Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Dashboard unavailable' });
  }
};

// Delete Validator (for monitoring validators only)
export const deleteValidator = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Validator.findOneAndDelete({ _id: id, user: req.user._id });
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Validator not found or unauthorized' });
    }
    
    res.json({ success: true, message: 'Validator removed' });
  } catch (error) {
    logger.error('Delete Validator Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete validator' });
  }
};

// Request Service Cancellation (for managed/Selfnodes validators)
export const requestCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const validator = await Validator.findOne({ _id: id, user: req.user._id });
    
    if (!validator) {
      return res.status(404).json({ success: false, message: 'Validator not found or unauthorized' });
    }
    
    if (validator.serviceType !== 'managed') {
      return res.status(400).json({ success: false, message: 'Only managed validators can request cancellation' });
    }
    
    // Update validator status
    validator.cancellationRequested = true;
    validator.cancellationRequestedAt = new Date();
    validator.cancellationReason = reason || 'User requested cancellation';
    await validator.save();
    
    // Also update the NodeOrder if linked
    if (validator.nodeOrder) {
      await NodeOrder.findByIdAndUpdate(validator.nodeOrder, {
        $set: {
          cancellationRequested: true,
          cancellationRequestedAt: new Date(),
          cancellationReason: reason || 'User requested cancellation'
        }
      });
    }
    
    logger.info(`🚫 Cancellation requested for validator ${validator.publicKey.slice(0, 16)}... by user ${req.user._id}`);
    
    // Send admin alert
    const { sendAlertToAdmin } = await import('../services/telegram.service.js');
    await sendAlertToAdmin(
      `🚫 *Cancellation Request*\n\n` +
      `📧 User: ${req.user.email}\n` +
      `🔢 Validator: ${validator.index}\n` +
      `🌐 Network: ${validator.network}\n` +
      `📝 Reason: ${reason || 'No reason provided'}\n\n` +
      `🔗 [View in Control Center](https://monitoring.swigs.online/selfnodes)`
    );
    
    res.json({ success: true, message: 'Cancellation request submitted. Our team will process it shortly.' });
  } catch (error) {
    logger.error('Request Cancellation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to request cancellation' });
  }
};

// Connect Telegram
export const connectTelegram = async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    logger.info(`🔌 Connect Telegram Request: ${telegramId} for User ${req.user._id}`);
    logger.info(`🔍 User Model: ${req.user.constructor.modelName}, Role: ${req.user.role}`);

    // Note: telegramId peut être null/empty pour déconnecter
    
    // Mettre à jour l'utilisateur (User ou Customer)
    req.user.telegramUserId = telegramId;
    
    // Gérer les préférences
    if (!req.user.preferences) req.user.preferences = {};
    
    // Si telegramId est présent, on active les notifs, sinon on désactive
    if (telegramId) {
        req.user.preferences.telegramNotifications = true;
    } else {
        req.user.preferences.telegramNotifications = false;
    }
    
    // Mark as modified si c'est un objet imbriqué (Mongoose detection)
    req.user.markModified('preferences');
    
    const savedUser = await req.user.save();
    logger.info(`✅ Telegram ID Saved: ${savedUser.telegramUserId} (Notifications: ${savedUser.preferences?.telegramNotifications})`);
    
    res.json({ success: true, message: telegramId ? 'Telegram connected' : 'Telegram disconnected' });
  } catch (error) {
    logger.error('Telegram Connect Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update Telegram settings' });
  }
};

// --- AGENT ONLY ENDPOINTS ---

// Unified Report Handler (System + Validators)
export const processAgentReport = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { system, docker, validators, timestamp, type } = req.body; // Type: FULL, STATUS, ALERT

    // Prepare Update Object
    const serverUpdate = { lastHeartbeat: timestamp || new Date() };
    
    // Only update system metrics if provided (FULL report)
    if (system) serverUpdate.resources = system;
    
    // Only update Docker status if provided (FULL report)
    if (docker) {
      serverUpdate.status = docker.isRunning ? 'online' : 'offline';
      serverUpdate.softwareVersions = docker.components;
    }

    // 1. Update Server Status
    const server = await NodeServer.findByIdAndUpdate(
      nodeId,
      serverUpdate,
      { new: true }
    );

    if (!server) {
      return res.status(404).json({ success: false, message: 'NodeServer not found' });
    }

    // 2. Update Validators (Batch)
    let updatedValidators = 0;
    if (validators && validators.length > 0) {
      for (const val of validators) {
        const updateData = {
          status: val.status,
          balance: val.balance / 1e9,
          effectiveBalance: val.effectiveBalance / 1e9,
          index: val.validatorIndex,
          activationEpoch: val.activationEpoch,
          exitEpoch: val.exitEpoch,
          slashed: val.slashed,
          server: server._id,
          lastKnownStatus: val.status
        };
        
        // Check if validator is back online and had alerts
        const existingValidator = await Validator.findOne({ publicKey: val.pubkey });
        const wasOffline = existingValidator?.alertCount > 0;
        
        if (val.status === 'active_ongoing' && wasOffline) {
          updateData.alertCount = 0;
          
          // Send recovery notification
          if (existingValidator.user) {
            const populatedVal = await Validator.findOne({ publicKey: val.pubkey }).populate('user');
            if (populatedVal?.user?.telegramUserId) {
              const recoveryMsg = `✅ Validator Back Online\n\n` +
                `Good news! Your validator is back online:\n` +
                `• ${populatedVal.name || 'Validator ' + populatedVal.index}\n\n` +
                `🔗 View Dashboard: https://selfnodes.swigs.online/dashboard`;
              await sendTelegramAlert(populatedVal.user.telegramUserId, recoveryMsg, false);
              logger.info(`✅ Recovery notification sent for validator ${val.validatorIndex}`);
            }
          }
        }
        
        await Validator.findOneAndUpdate({ publicKey: val.pubkey }, updateData);
        updatedValidators++;
      }
      
      // Trigger Telegram Alert if it's an ALERT report
      if (type === 'ALERT') {
        logger.warn(`🚨 ALERT received from node ${nodeId}: ${updatedValidators} validators with issues.`);
        
        // Alert cooldown: 24 hours between alerts for the same validator
        const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
        const now = new Date();
        
        const problemPubkeys = validators.map(v => v.pubkey);
        const problemIndexes = validators.map(v => v.validatorIndex);
        
        const affectedValidators = await Validator.find({ 
          $or: [
            { publicKey: { $in: problemPubkeys } },
            { index: { $in: problemIndexes } }
          ]
        }).populate('user');
        
        logger.info(`📊 Found ${affectedValidators.length} matching validators in DB`);
        
        const notifiedUsers = new Set();
        let alertsSent = 0, alertsSkipped = 0;
        
        for (const val of affectedValidators) {
          if (!val.user || !val.user.telegramUserId) continue;
          if (notifiedUsers.has(val.user._id.toString())) continue;
          
          // Cooldown check: skip if alert sent in last 4 hours
          const timeSince = val.lastAlertSent ? (now - new Date(val.lastAlertSent)) : Infinity;
          if (timeSince < ALERT_COOLDOWN_MS) {
            logger.info(`⏳ Cooldown: validator ${val.index} (${Math.round((ALERT_COOLDOWN_MS - timeSince) / 60000)}min left)`);
            alertsSkipped++;
            continue;
          }
          
          const problemValidator = validators.find(v => v.pubkey === val.publicKey || v.validatorIndex === val.index);
          const validatorName = val.name || `Validator ${val.index}`;
          const status = problemValidator?.status || 'Unknown';
          
          const alertMessage = `🚨 Validator Alert\n\n` +
            `Your validator has an issue:\n` +
            `• ${validatorName}: ${status}\n\n` +
            `🔗 View Dashboard: https://selfnodes.swigs.online/dashboard`;
          
          const sent = await sendTelegramAlert(val.user.telegramUserId, alertMessage, false);
          if (sent) {
            const newAlertCount = (val.alertCount || 0) + 1;
            await Validator.updateOne({ _id: val._id }, { 
              lastAlertSent: now,
              alertCount: newAlertCount,
              $inc: { totalAlertCount: 1 }
            });
            notifiedUsers.add(val.user._id.toString());
            alertsSent++;
            logger.info(`📱 Alert #${newAlertCount} sent for validator ${val.index}`);
            
            // Flag validators with 7+ consecutive alerts (1 week offline)
            if (newAlertCount === 7) {
              logger.warn(`🚩 Validator ${val.index} has been offline for 7 days - user ${val.user._id} may need assistance`);
            }
          }
        }
        
        logger.info(`📊 Alerts: ${alertsSent} sent, ${alertsSkipped} skipped (cooldown)`)
      }
    }

    res.json({ 
      success: true, 
      message: 'Report processed', 
      serverStatus: server.status,
      validatorsUpdated: updatedValidators
    });

  } catch (error) {
    logger.error('Agent Report Processing Error:', error);
    // Return 200 even on error to prevent Agent from retrying infinitely if it's a data issue
    res.json({ success: false, message: 'Error processing report', error: error.message });
  }
};

// Get Pending Commands for Agent
export const getPendingCommands = async (req, res) => {
  try {
    const { nodeId } = req.params;
    // Get pending commands for this node
    const commands = await Command.find({ nodeId, status: 'pending' }).sort({ createdAt: 1 });
    res.json({ success: true, data: commands });
  } catch (error) {
    logger.error('Get Commands Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get commands' });
  }
};

// Update Command Status
export const updateCommandStatus = async (req, res) => {
  try {
    const { commandId } = req.params;
    const { status, logs } = req.body;
    
    await Command.findByIdAndUpdate(commandId, { 
      status, 
      logs 
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update command' });
  }
};

// Get Node Config for Agent
export const getNodeConfig = async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    // Find all validators linked to this server
    const validators = await Validator.find({ server: nodeId }).select('publicKey');
    const pubkeys = validators.map(v => v.publicKey);

    res.json({
      success: true,
      data: {
        nodeId,
        validators: pubkeys,
        // Add other config params here (network, etc)
      }
    });
  } catch (error) {
    logger.error('Config Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get config' });
  }
};

// --- ADMIN / USER ACTIONS ---

// Trigger Refresh Data (Called by User Dashboard)
export const triggerRefresh = async (req, res) => {
  try {
    // Pour simplifier, on rafraîchit TOUS les nœuds de l'utilisateur
    // Dans un système complexe, on ciblerait le nœud spécifique
    const validators = await Validator.find({ user: req.user._id }).populate('server');
    
    if (!validators.length) {
      return res.json({ success: true, message: 'No validators to refresh' });
    }

    // Récupérer les IDs uniques des serveurs
    const serverIds = [...new Set(validators.map(v => v.server?._id?.toString()).filter(Boolean))];

    let createdCount = 0;
    for (const nodeId of serverIds) {
      // Vérifier s'il n'y a pas déjà une commande pending récente (anti-spam)
      const pending = await Command.findOne({ 
        nodeId, 
        type: 'REFRESH_DATA', 
        status: { $in: ['pending', 'running'] } 
      });

      if (!pending) {
        await Command.create({
          type: 'REFRESH_DATA',
          nodeId,
          createdBy: req.user._id
        });
        createdCount++;
      }
    }

    res.json({ success: true, message: `Refresh triggered for ${createdCount} nodes` });
  } catch (error) {
    logger.error('Trigger Refresh Error:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger refresh' });
  }
};

// Trigger Update (Called by Admin)
export const triggerUpdate = async (req, res) => {
  try {
    const { nodeId } = req.body; // Admin must specify nodeId (serverId)
    
    // Récupérer le serveur pour avoir son IP et son user SSH
    const server = await NodeServer.findById(nodeId);
    
    // L'agent Raspberry Pi qui va exécuter la commande
    const agentNodeId = process.env.AGENT_NODE_ID || '692421917995954d267f616e';
    
    await Command.create({
      type: 'UPDATE_ETHDOCKER',
      nodeId: agentNodeId,
      serverId: nodeId,
      serverConfig: server ? {
        host: server.ipAddress,
        username: server.sshUser || 'swigs',
        port: 22
      } : null,
      createdBy: req.user._id
    });

    res.json({ success: true, message: 'Commande de mise à jour envoyée' });
  } catch (error) {
    logger.error('Trigger Update Error:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger update' });
  }
};

// Get all Node Servers (Admin)
export const getNodeServers = async (req, res) => {
  try {
    const servers = await NodeServer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: servers });
  } catch (error) {
    logger.error('Get Node Servers Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get node servers' });
  }
};

// Update Node Server (Admin)
export const updateNodeServer = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, ipAddress, type, status } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (ipAddress) updateData.ipAddress = ipAddress;
    if (type) updateData.type = type;
    if (status) updateData.status = status;
    
    const server = await NodeServer.findByIdAndUpdate(
      serverId,
      updateData,
      { new: true }
    );
    
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }
    
    res.json({ success: true, data: server });
  } catch (error) {
    logger.error('Update Node Server Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update node server' });
  }
};

// Create Node Server (Admin)
export const createNodeServer = async (req, res) => {
  try {
    const { name, host, network, sshUser } = req.body;
    
    if (!name || !host) {
      return res.status(400).json({ success: false, message: 'Name and host are required' });
    }
    
    const server = new NodeServer({
      name,
      ipAddress: host,
      sshUser: sshUser || 'swigs',
      network: network || 'ethereum',
      type: 'combined', // Default type
      status: 'offline',
      softwareVersions: { ethDocker: 'Non vérifiée' }
    });
    
    await server.save();
    
    res.status(201).json({ success: true, data: server });
  } catch (error) {
    logger.error('Create Node Server Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create node server' });
  }
};

// Trigger Version Check (Admin)
export const triggerVersionCheck = async (req, res) => {
  try {
    const { nodeId } = req.body;
    
    // Récupérer le serveur pour avoir son IP et son user SSH
    const server = await NodeServer.findById(nodeId);
    
    // L'agent Raspberry Pi qui va exécuter la commande
    const agentNodeId = process.env.AGENT_NODE_ID || '692421917995954d267f616e';
    
    const command = await Command.create({
      type: 'VERSION_CHECK',
      nodeId: agentNodeId,
      serverId: nodeId, // Le serveur cible
      serverConfig: server ? {
        host: server.ipAddress,
        username: server.sshUser || 'swigs',
        port: 22
      } : null,
      createdBy: req.user._id
    });

    logger.info(`VERSION_CHECK command created: ${command._id} for server ${server?.name || nodeId}`);
    res.json({ success: true, message: 'Commande de vérification de version envoyée' });
  } catch (error) {
    logger.error('Trigger Version Check Error:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger version check' });
  }
};

// Update Server Version (Agent)
export const updateServerVersion = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { version } = req.body;
    
    const server = await NodeServer.findByIdAndUpdate(
      serverId,
      { 
        'softwareVersions.ethDocker': version,
        lastHeartbeat: new Date(),
        status: 'online', // Si on peut récupérer la version, le serveur est accessible
        sshStatus: 'connected'
      },
      { new: true }
    );
    
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }
    
    res.json({ success: true, data: server });
  } catch (error) {
    logger.error('Update Server Version Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update server version' });
  }
};

// Get Servers for Agent
export const getServersForAgent = async (req, res) => {
  try {
    const servers = await NodeServer.find().select('name ipAddress type status softwareVersions');
    res.json({ success: true, data: servers });
  } catch (error) {
    logger.error('Get Servers for Agent Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get servers' });
  }
};

// Update Server Metrics (Agent)
export const updateServerMetrics = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { metrics } = req.body;
    
    const updateData = {
      lastHeartbeat: new Date(),
      status: 'online',
      sshStatus: 'connected'
    };
    
    // Map metrics to resources
    if (metrics) {
      updateData.resources = {
        cpuUsage: metrics.cpuUsage,
        diskUsage: metrics.diskUsage,
        diskTotal: metrics.diskTotal,
        ramUsage: metrics.ramUsage,
        ramTotal: metrics.ramTotal
      };
      
      // Update status based on sync
      if (metrics.isSyncing) {
        updateData.status = 'syncing';
      }
    }
    
    const server = await NodeServer.findByIdAndUpdate(
      serverId,
      updateData,
      { new: true }
    );
    
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }
    
    res.json({ success: true, data: server });
  } catch (error) {
    logger.error('Update Server Metrics Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update server metrics' });
  }
};

// Trigger Fetch Metrics (Admin)
export const triggerFetchMetrics = async (req, res) => {
  try {
    const { nodeId } = req.body;
    
    const server = await NodeServer.findById(nodeId);
    
    const agentNodeId = process.env.AGENT_NODE_ID || '692421917995954d267f616e';
    
    const command = await Command.create({
      type: 'FETCH_METRICS',
      nodeId: agentNodeId,
      serverId: nodeId,
      serverConfig: server ? {
        host: server.ipAddress,
        username: server.sshUser || 'swigs',
        port: 22
      } : null,
      createdBy: req.user._id
    });

    logger.info(`FETCH_METRICS command created: ${command._id} for server ${server?.name || nodeId}`);
    res.json({ success: true, message: 'Commande de récupération des métriques envoyée' });
  } catch (error) {
    logger.error('Trigger Fetch Metrics Error:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger fetch metrics' });
  }
};

// Test Telegram Alert (Called by User from Dashboard)
export const testTelegramAlert = async (req, res) => {
  try {
    const telegramId = req.user.telegramUserId;
    
    if (!telegramId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No Telegram ID connected. Please connect your Telegram first.' 
      });
    }
    
    const testMessage = `✅ *Test Alert Successful!*\n\n` +
      `This is a test notification from SelfNodes.\n` +
      `Your alerts are working correctly.\n\n` +
      `🕐 Time: ${new Date().toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' })}\n` +
      `👤 User: ${req.user.email || req.user.firstName || 'Unknown'}`;
    
    const sent = await sendTelegramAlert(telegramId, testMessage);
    
    if (sent) {
      logger.info(`✅ Test alert sent to ${telegramId}`);
      res.json({ success: true, message: 'Test alert sent! Check your Telegram.' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send test alert. Check bot configuration.' });
    }
  } catch (error) {
    logger.error('Test Alert Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test alert' });
  }
};

// --- STRIPE PAYMENT ENDPOINTS ---

// Create Stripe Checkout Session for Node Provisioning
export const createCheckoutSession = async (req, res) => {
  try {
    const { keystores, password, mode, network, validatorCount, pricePerValidator, currency, siteId } = req.body;
    
    if (!keystores || keystores.length === 0) {
      return res.status(400).json({ success: false, message: 'Keystore files are required' });
    }
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Keystore password is required' });
    }
    
    // Get site with Stripe config
    const site = await Site.findById(siteId).select('+stripeConfig.secretKey');
    
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }
    
    if (!site.stripeConfig?.secretKey) {
      return res.status(500).json({ success: false, message: 'Stripe not configured for this site' });
    }
    
    // Initialize Stripe
    const stripe = new Stripe(site.stripeConfig.secretKey);
    
    // Create NodeOrder with encrypted keystores BEFORE payment
    const order = new NodeOrder({
      customer: req.user._id,
      email: req.user.email,
      orderType: mode || 'migrate',
      network: (network || 'ethereum').toLowerCase(),
      validatorCount: keystores.length,
      pricePerValidator: pricePerValidator || 50,
      currency: (currency || 'usd').toUpperCase(),
      status: 'pending_payment',
      paymentStatus: 'pending'
    });
    
    // Add encrypted keystores
    for (const ks of keystores) {
      const pubkey = ks.pubkey || null;
      order.addKeystore(ks.filename || `keystore-${Date.now()}.json`, ks, pubkey);
    }
    
    // Set encrypted password
    order.setKeystorePassword(password);
    
    await order.save();
    
    logger.info(`📦 NodeOrder ${order._id} created with ${keystores.length} encrypted keystores`);
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: (currency || 'usd').toLowerCase(),
          product_data: {
            name: `Validator Node Hosting - ${network?.toUpperCase() || 'ETH'}`,
            description: `${keystores.length} validator(s) - ${mode === 'create' ? 'New Creation' : 'Migration'}`,
          },
          unit_amount: Math.round((pricePerValidator || 50) * 100), // Stripe uses cents
          recurring: {
            interval: 'month',
          },
        },
        quantity: keystores.length,
      }],
      mode: 'subscription',
      success_url: `https://${site.domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://${site.domain}/migrate?cancelled=true`,
      metadata: {
        siteId: siteId,
        userId: req.user._id.toString(),
        orderId: order._id.toString(),
        mode,
        network,
        validatorCount: keystores.length.toString(),
      },
      customer_email: req.user.email,
      subscription_data: {
        metadata: {
          siteId: siteId,
          userId: req.user._id.toString(),
          orderId: order._id.toString(),
        },
      },
    });
    
    // Update order with Stripe session ID
    order.stripeSessionId = session.id;
    await order.save();
    
    logger.info(`🔐 Stripe checkout created for ${req.user.email} - ${keystores.length} validators - Session: ${session.id} - Order: ${order._id}`);
    
    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: order._id,
    });
    
  } catch (error) {
    logger.error('Create Checkout Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create checkout session' });
  }
};

// Verify Payment after Stripe redirect
export const verifyPayment = async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    
    // Get site from session metadata
    // For now, we'll try to find the site from the user's context
    const sites = await Site.find().select('+stripeConfig.secretKey');
    
    let session = null;
    let usedSite = null;
    
    // Try each site's Stripe config to find the session
    for (const site of sites) {
      if (!site.stripeConfig?.secretKey) continue;
      
      try {
        const stripe = new Stripe(site.stripeConfig.secretKey);
        session = await stripe.checkout.sessions.retrieve(session_id);
        usedSite = site;
        break;
      } catch (e) {
        // Session not found with this key, try next
        continue;
      }
    }
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Payment session not found' });
    }
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }
    
    // Update NodeOrder with payment info
    const orderId = session.metadata?.orderId;
    let createdValidators = [];
    
    if (orderId) {
      const order = await NodeOrder.findById(orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.status = 'pending_setup';
        order.paidAt = new Date();
        order.stripeSubscriptionId = session.subscription;
        await order.save();
        logger.info(`✅ NodeOrder ${orderId} marked as paid`);
        
        // Auto-create Validators from keystores pubkeys
        const defaultServer = await NodeServer.findOne();
        
        for (const keystore of order.keystores) {
          if (keystore.pubkey) {
            try {
              // Check if validator already exists
              const existingValidator = await Validator.findOne({ publicKey: keystore.pubkey });
              
              if (!existingValidator) {
                const validator = await Validator.create({
                  publicKey: keystore.pubkey,
                  name: `Validator ${keystore.pubkey.slice(0, 8)}...`,
                  network: order.network || 'ethereum',
                  serviceType: 'managed', // Selfnodes managed validator
                  user: order.customer,
                  server: defaultServer?._id,
                  status: 'pending', // Will be updated when activated on chain
                  nodeOrder: order._id,
                });
                createdValidators.push(validator);
                logger.info(`✅ Validator created for pubkey ${keystore.pubkey.slice(0, 16)}...`);
              } else {
                logger.info(`ℹ️ Validator already exists for pubkey ${keystore.pubkey.slice(0, 16)}...`);
              }
            } catch (validatorError) {
              logger.error(`❌ Failed to create validator for pubkey ${keystore.pubkey}:`, validatorError.message);
            }
          }
        }
      }
    }
    
    logger.info(`✅ Payment verified for session ${session_id}, created ${createdValidators.length} validators`);
    
    // Send admin alert for new Selfnodes order
    const { sendAlertToAdmin } = await import('../services/telegram.service.js');
    const order = await NodeOrder.findById(orderId).populate('customer', 'email firstName lastName');
    if (order) {
      await sendAlertToAdmin(
        `🎉 *New Selfnodes Order!*\n\n` +
        `📧 Customer: ${order.customer?.email || order.email}\n` +
        `🔢 Validators: ${order.validatorCount}\n` +
        `🌐 Network: ${order.network}\n` +
        `💰 Amount: $${session.amount_total / 100}\n` +
        `📦 Keystores: ${order.keystores.length} files\n\n` +
        `🔗 [View in Control Center](https://monitoring.swigs.online/selfnodes)`
      );
    }
    
    res.json({
      success: true,
      order: {
        orderId: orderId || session.id,
        validatorCount: parseInt(session.metadata?.validatorCount || '1'),
        amount: session.amount_total / 100,
        status: 'paid',
      },
    });
    
  } catch (error) {
    logger.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};

// ==================== NODE ORDER / KEYSTORE MANAGEMENT ====================

// Upload keystores for an order (User)
export const uploadKeystores = async (req, res) => {
  try {
    const { orderId, keystores, password, depositData, network = 'ethereum', mode = 'migrate' } = req.body;
    
    if (!keystores || !Array.isArray(keystores) || keystores.length === 0) {
      return res.status(400).json({ success: false, message: 'Keystores are required' });
    }
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Keystore password is required' });
    }
    
    // Find or create order
    let order;
    if (orderId) {
      order = await NodeOrder.findOne({ _id: orderId, customer: req.user._id });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
    } else {
      // Create new order
      order = new NodeOrder({
        customer: req.user._id,
        email: req.user.email,
        orderType: mode,
        network: network.toLowerCase(),
        validatorCount: keystores.length,
        status: 'pending_payment'
      });
    }
    
    // Add keystores (encrypted)
    for (const ks of keystores) {
      const pubkey = ks.content?.pubkey || ks.pubkey || null;
      order.addKeystore(ks.filename, ks.content, pubkey);
    }
    
    // Set encrypted password
    order.setKeystorePassword(password);
    
    // Add deposit data if provided
    if (depositData) {
      order.depositData = depositData;
    }
    
    // Update status
    if (order.paymentStatus === 'paid') {
      order.status = 'pending_setup';
    } else {
      order.status = 'pending_keystores';
    }
    
    await order.save();
    
    logger.info(`📦 Keystores uploaded for order ${order._id} - ${keystores.length} files - User: ${req.user.email}`);
    
    res.json({
      success: true,
      orderId: order._id,
      message: `${keystores.length} keystore(s) uploaded securely`,
      status: order.status
    });
    
  } catch (error) {
    logger.error('Upload Keystores Error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload keystores' });
  }
};

// Get user's orders (User)
export const getUserOrders = async (req, res) => {
  try {
    const orders = await NodeOrder.find({ customer: req.user._id })
      .select('-keystores.encryptedContent -keystorePassword') // Don't send encrypted data to frontend
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders.map(order => ({
        id: order._id,
        orderType: order.orderType,
        network: order.network,
        validatorCount: order.validatorCount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        keystoreCount: order.keystores.length,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        activatedAt: order.activatedAt
      }))
    });
    
  } catch (error) {
    logger.error('Get User Orders Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get orders' });
  }
};

// ==================== ADMIN ENDPOINTS ====================

// Get all orders (Admin)
export const getAdminOrders = async (req, res) => {
  try {
    const { status, network, paymentStatus } = req.query;
    
    const orders = await NodeOrder.getAdminDashboard({
      status,
      network,
      paymentStatus
    });
    
    res.json({
      success: true,
      count: orders.length,
      data: orders.map(order => ({
        id: order._id,
        customer: order.customer ? {
          id: order.customer._id,
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          email: order.customer.email
        } : { email: order.email },
        orderType: order.orderType,
        network: order.network,
        validatorCount: order.validatorCount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        keystoreCount: order.keystores.length,
        hasPassword: !!order.keystorePassword,
        assignedServer: order.assignedServer?.name || null,
        pricePerValidator: order.pricePerValidator,
        currency: order.currency,
        adminNotes: order.adminNotes,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        setupStartedAt: order.setupStartedAt,
        activatedAt: order.activatedAt,
        cancellationRequested: order.cancellationRequested || false,
        cancellationRequestedAt: order.cancellationRequestedAt,
        cancellationReason: order.cancellationReason
      }))
    });
    
  } catch (error) {
    logger.error('Get Admin Orders Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get orders' });
  }
};

// Get pending actions count for notification badge (Admin)
export const getAdminNotifications = async (req, res) => {
  try {
    // Count orders pending setup (new orders that need attention)
    const pendingSetup = await NodeOrder.countDocuments({ 
      status: { $in: ['pending_setup', 'pending_keystores'] }
    });
    
    // Count cancellation requests
    const cancellationRequests = await NodeOrder.countDocuments({ 
      cancellationRequested: true,
      status: { $ne: 'cancelled' }
    });
    
    const total = pendingSetup + cancellationRequests;
    
    res.json({
      success: true,
      data: {
        total,
        pendingSetup,
        cancellationRequests
      }
    });
  } catch (error) {
    logger.error('Get Admin Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
};

// Get order details with decrypted keystores (Admin)
export const getOrderKeystores = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await NodeOrder.findById(orderId)
      .populate('customer', 'firstName lastName email')
      .populate('assignedServer', 'name');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Decrypt keystores and password
    const decryptedKeystores = order.getDecryptedKeystores();
    const decryptedPassword = order.getKeystorePassword();
    
    logger.info(`🔓 Admin ${req.user.email} accessed keystores for order ${orderId}`);
    
    res.json({
      success: true,
      data: {
        id: order._id,
        customer: order.customer ? {
          id: order.customer._id,
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          email: order.customer.email
        } : { email: order.email },
        orderType: order.orderType,
        network: order.network,
        validatorCount: order.validatorCount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        keystores: decryptedKeystores,
        keystorePassword: decryptedPassword,
        depositData: order.depositData,
        assignedServer: order.assignedServer,
        adminNotes: order.adminNotes,
        createdAt: order.createdAt,
        paidAt: order.paidAt
      }
    });
    
  } catch (error) {
    logger.error('Get Order Keystores Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get keystores' });
  }
};

// Update order status (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminNotes, assignedServer } = req.body;
    
    const order = await NodeOrder.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (status) {
      order.status = status;
      
      // Set timestamps based on status
      if (status === 'in_progress' && !order.setupStartedAt) {
        order.setupStartedAt = new Date();
      }
      if (status === 'active' && !order.activatedAt) {
        order.activatedAt = new Date();
      }
    }
    
    if (adminNotes !== undefined) {
      order.adminNotes = adminNotes;
    }
    
    if (assignedServer) {
      order.assignedServer = assignedServer;
    }
    
    await order.save();
    
    logger.info(`📝 Order ${orderId} updated by admin ${req.user.email} - Status: ${status}`);
    
    res.json({
      success: true,
      message: 'Order updated',
      data: {
        id: order._id,
        status: order.status,
        adminNotes: order.adminNotes
      }
    });
    
  } catch (error) {
    logger.error('Update Order Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
};

// Download keystore file (Admin)
export const downloadKeystore = async (req, res) => {
  try {
    const { orderId, keystoreIndex } = req.params;
    
    const order = await NodeOrder.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const keystores = order.getDecryptedKeystores();
    const keystore = keystores[parseInt(keystoreIndex)];
    
    if (!keystore) {
      return res.status(404).json({ success: false, message: 'Keystore not found' });
    }
    
    logger.info(`📥 Admin ${req.user.email} downloaded keystore ${keystoreIndex} from order ${orderId}`);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${keystore.filename}"`);
    res.send(JSON.stringify(keystore.content, null, 2));
    
  } catch (error) {
    logger.error('Download Keystore Error:', error);
    res.status(500).json({ success: false, message: 'Failed to download keystore' });
  }
};
