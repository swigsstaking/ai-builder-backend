import express from 'express';
import { 
  getUserDashboard, 
  addValidator,
  deleteValidator,
  requestCancellation,
  connectTelegram,
  testTelegramAlert,
  processAgentReport,
  getNodeConfig,
  getPendingCommands,
  updateCommandStatus,
  triggerUpdate,
  triggerRefresh,
  triggerVersionCheck,
  triggerFetchMetrics,
  createCheckoutSession,
  verifyPayment,
  uploadKeystores,
  getUserOrders,
  getAdminOrders,
  getAdminNotifications,
  getOrderKeystores,
  updateOrderStatus,
  downloadKeystore,
  getNodeServers,
  updateNodeServer,
  createNodeServer,
  updateServerVersion,
  updateServerMetrics,
  getServersForAgent
} from '../controllers/node.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { protectAgent } from '../middleware/agentAuth.middleware.js';
import { requireAdmin } from '../middleware/permissions.middleware.js';

const router = express.Router();

// --- USER ROUTES ---
// Used by the Frontend Dashboard
router.get('/dashboard', protect, getUserDashboard);
router.post('/refresh', protect, triggerRefresh);
router.post('/validators', protect, addValidator);
router.delete('/validators/:id', protect, deleteValidator);
router.post('/validators/:id/cancel', protect, requestCancellation);
router.post('/telegram/connect', protect, connectTelegram);
router.post('/telegram/test', protect, testTelegramAlert);

// --- STRIPE PAYMENT ROUTES ---
router.post('/create-checkout', protect, createCheckoutSession);
router.get('/verify-payment', protect, verifyPayment);

// --- KEYSTORE / ORDER ROUTES (User) ---
router.post('/upload-keystores', protect, uploadKeystores);
router.get('/orders', protect, getUserOrders);

// --- ADMIN ROUTES ---
// Used by Admin Panel to trigger updates
router.post('/update', protect, requireAdmin, triggerUpdate);
router.post('/version', protect, requireAdmin, triggerVersionCheck);
router.post('/metrics', protect, requireAdmin, triggerFetchMetrics);
router.get('/servers', protect, requireAdmin, getNodeServers);
router.post('/servers', protect, requireAdmin, createNodeServer);
router.put('/servers/:serverId', protect, requireAdmin, updateNodeServer);

// --- ADMIN ORDER MANAGEMENT ---
router.get('/admin/notifications', protect, requireAdmin, getAdminNotifications);
router.get('/admin/orders', protect, requireAdmin, getAdminOrders);
router.get('/admin/orders/:orderId/keystores', protect, requireAdmin, getOrderKeystores);
router.put('/admin/orders/:orderId', protect, requireAdmin, updateOrderStatus);
router.get('/admin/orders/:orderId/keystores/:keystoreIndex/download', protect, requireAdmin, downloadKeystore);

// --- AGENT ROUTES ---
// Used by the Raspberry Pi Agent
// Secured by API Key (x-agent-key)
router.post('/:nodeId/report', protectAgent, processAgentReport);
router.get('/:nodeId/config', protectAgent, getNodeConfig);
router.get('/:nodeId/commands/pending', protectAgent, getPendingCommands);
router.put('/commands/:commandId', protectAgent, updateCommandStatus);
router.put('/servers/:serverId/version', protectAgent, updateServerVersion);
router.put('/servers/:serverId/metrics', protectAgent, updateServerMetrics);
router.get('/servers/agent', protectAgent, getServersForAgent);

export default router;
