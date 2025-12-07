import axios from 'axios';
import logger from '../utils/logger.js';

class NodeAgentService {
  constructor() {
    this.agentUrl = process.env.NODE_AGENT_URL || 'http://localhost:4000';
    this.apiKey = process.env.NODE_AGENT_KEY || 'dev-secret-key';
    
    this.client = axios.create({
      baseURL: this.agentUrl,
      timeout: 10000, // 10s timeout for blockchain ops
      headers: {
        'X-Agent-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check health of the Agent
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error(`NodeAgent Health Check Failed: ${error.message}`);
      throw new Error('Node Agent unreachable');
    }
  }

  /**
   * Get Validator Status
   * @param {string} pubkey 
   */
  async getValidatorStatus(pubkey) {
    try {
      const response = await this.client.get(`/validators/${pubkey}/status`);
      return response.data;
    } catch (error) {
      logger.error(`Get Validator Status Failed: ${error.message}`);
      // Fallback mock data if agent is offline (for dev)
      if (process.env.NODE_ENV === 'development') {
         return { status: 'active_online', balance: '32.45', effective_balance: '32.0' };
      }
      throw error;
    }
  }

  /**
   * Import Keystores
   * @param {Array} keystores - Array of JSON keystore objects
   * @param {string} password 
   */
  async importKeystores(keystores, password) {
    try {
      // NEVER LOG PASSWORDS
      logger.info(`Importing ${keystores.length} keys to Node Agent...`);
      
      const response = await this.client.post('/validators/import', {
        keystores,
        password
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Import Keystores Failed: ${error.message}`);
      throw error;
    }
  }
}

export default new NodeAgentService();
