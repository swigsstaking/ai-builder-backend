/**
 * Deployment Controller
 * Handles deployment API endpoints
 */

import { 
  deployFullSite, 
  checkDeploymentStatus,
  createDeploymentPackage,
  buildSite
} from '../services/deployment.service.js';
import { generateProjectFiles } from '../services/site-generator.service.js';

/**
 * Deploy a generated site
 * POST /api/deployment/deploy
 */
export const deploySite = async (req, res) => {
  try {
    const { siteConfig, generatedContent } = req.body;
    
    if (!siteConfig || !siteConfig.siteSlug) {
      return res.status(400).json({
        success: false,
        message: 'siteConfig with siteSlug is required'
      });
    }
    
    console.log(`📦 Starting deployment for ${siteConfig.siteSlug}...`);
    
    // Generate project files if not provided
    let files = req.body.files;
    if (!files || files.length === 0) {
      const projectResult = generateProjectFiles(siteConfig);
      files = projectResult.files;
    }
    
    // Deploy the site
    const result = await deployFullSite(siteConfig, files);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Site deployed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Deployment failed',
        error: result.error,
        steps: result.steps
      });
    }
    
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({
      success: false,
      message: 'Deployment failed',
      error: error.message
    });
  }
};

/**
 * Check deployment status
 * GET /api/deployment/status/:domain
 */
export const getDeploymentStatus = async (req, res) => {
  try {
    const { domain } = req.params;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }
    
    const status = await checkDeploymentStatus(domain);
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Status check failed',
      error: error.message
    });
  }
};

/**
 * Queue a deployment (for async processing)
 * POST /api/deployment/queue
 */
export const queueDeployment = async (req, res) => {
  try {
    const { siteConfig, projectId } = req.body;
    
    if (!siteConfig || !siteConfig.siteSlug) {
      return res.status(400).json({
        success: false,
        message: 'siteConfig with siteSlug is required'
      });
    }
    
    // For now, just return a job ID
    // In production, this would add to a queue (Redis, Bull, etc.)
    const jobId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📋 Deployment queued: ${jobId} for ${siteConfig.siteSlug}`);
    
    // Start deployment in background (fire and forget)
    setImmediate(async () => {
      try {
        const projectResult = generateProjectFiles(siteConfig);
        await deployFullSite(siteConfig, projectResult.files);
      } catch (error) {
        console.error(`❌ Background deployment failed for ${jobId}:`, error);
      }
    });
    
    res.json({
      success: true,
      message: 'Deployment queued',
      data: {
        jobId,
        siteSlug: siteConfig.siteSlug,
        estimatedDomain: siteConfig.siteDomain || `${siteConfig.siteSlug}.swigs.online`
      }
    });
    
  } catch (error) {
    console.error('Queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue deployment',
      error: error.message
    });
  }
};

/**
 * Get list of deployed sites
 * GET /api/deployment/sites
 */
export const getDeployedSites = async (req, res) => {
  try {
    // This would typically query a database
    // For now, return a placeholder
    res.json({
      success: true,
      data: {
        sites: [],
        message: 'Site list not yet implemented'
      }
    });
    
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sites',
      error: error.message
    });
  }
};

export default {
  deploySite,
  getDeploymentStatus,
  queueDeployment,
  getDeployedSites
};
