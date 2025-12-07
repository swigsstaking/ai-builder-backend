/**
 * Deployment Routes
 * Handles site deployment endpoints
 */

import express from 'express';
import {
  deploySite,
  getDeploymentStatus,
  queueDeployment,
  getDeployedSites
} from '../controllers/deployment.controller.js';

const router = express.Router();

// Deploy a site (synchronous - waits for completion)
router.post('/deploy', deploySite);

// Queue a deployment (asynchronous - returns immediately)
router.post('/queue', queueDeployment);

// Check deployment status
router.get('/status/:domain', getDeploymentStatus);

// Get list of deployed sites
router.get('/sites', getDeployedSites);

export default router;
