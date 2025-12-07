/**
 * Deployment Service
 * Handles automatic deployment of generated sites to the server
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';

const execAsync = promisify(exec);

// Configuration
const DEPLOY_SERVER = process.env.DEPLOY_SERVER || '192.168.110.73';
const DEPLOY_USER = process.env.DEPLOY_USER || 'swigs';
const DEPLOY_BASE_PATH = process.env.DEPLOY_BASE_PATH || '/var/www';
const NGINX_SITES_PATH = '/etc/nginx/sites-available';
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/ai-builder-deploy';

/**
 * Generate Nginx configuration for a new site
 * @param {string} subdomain - Site subdomain (e.g., 'mon-site')
 * @param {string} domain - Full domain (e.g., 'mon-site.swigs.online')
 * @returns {string} Nginx configuration
 */
export const generateNginxConfig = (subdomain, domain) => {
  return `server {
    server_name ${domain};
    root ${DEPLOY_BASE_PATH}/${subdomain};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    listen 80;
}
`;
};

/**
 * Create deployment package from generated site
 * @param {Object} siteConfig - Site configuration
 * @param {Object} generatedFiles - Generated files from site-generator
 * @returns {Promise<string>} Path to the deployment package
 */
export const createDeploymentPackage = async (siteConfig, generatedFiles) => {
  const { siteSlug } = siteConfig;
  const packageDir = path.join(TEMP_DIR, siteSlug);
  
  // Create temp directory
  await fs.mkdir(packageDir, { recursive: true });
  
  // Write all generated files
  for (const file of generatedFiles) {
    const filePath = path.join(packageDir, file.path);
    const fileDir = path.dirname(filePath);
    
    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(filePath, file.content);
  }
  
  console.log(`📦 Deployment package created at ${packageDir}`);
  return packageDir;
};

/**
 * Build the site using npm
 * @param {string} packageDir - Path to the package directory
 * @returns {Promise<string>} Path to the dist directory
 */
export const buildSite = async (packageDir) => {
  console.log(`🔨 Building site in ${packageDir}...`);
  
  try {
    // Install dependencies
    await execAsync('npm install', { cwd: packageDir, timeout: 120000 });
    console.log('✅ Dependencies installed');
    
    // Build the site
    await execAsync('npm run build', { cwd: packageDir, timeout: 120000 });
    console.log('✅ Site built successfully');
    
    return path.join(packageDir, 'dist');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    throw new Error(`Build failed: ${error.message}`);
  }
};

/**
 * Deploy site to server via SSH
 * @param {string} distPath - Path to the dist directory
 * @param {string} subdomain - Site subdomain
 * @returns {Promise<Object>} Deployment result
 */
export const deployToServer = async (distPath, subdomain) => {
  const remotePath = `${DEPLOY_BASE_PATH}/${subdomain}`;
  const sshTarget = `${DEPLOY_USER}@${DEPLOY_SERVER}`;
  
  console.log(`🚀 Deploying to ${sshTarget}:${remotePath}...`);
  
  try {
    // Create remote directory
    await execAsync(`ssh ${sshTarget} "sudo mkdir -p ${remotePath}"`);
    
    // Copy files to server
    await execAsync(`scp -r ${distPath}/* ${sshTarget}:${remotePath}/`);
    
    // Set permissions
    await execAsync(`ssh ${sshTarget} "sudo chown -R www-data:www-data ${remotePath}"`);
    
    console.log('✅ Files deployed successfully');
    
    return {
      success: true,
      path: remotePath,
      server: DEPLOY_SERVER
    };
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw new Error(`Deployment failed: ${error.message}`);
  }
};

/**
 * Configure Nginx for the new site
 * @param {string} subdomain - Site subdomain
 * @param {string} domain - Full domain
 * @returns {Promise<Object>} Configuration result
 */
export const configureNginx = async (subdomain, domain) => {
  const sshTarget = `${DEPLOY_USER}@${DEPLOY_SERVER}`;
  const configPath = `${NGINX_SITES_PATH}/${domain}`;
  const nginxConfig = generateNginxConfig(subdomain, domain);
  
  console.log(`⚙️ Configuring Nginx for ${domain}...`);
  
  try {
    // Write Nginx config
    const tempConfigPath = `/tmp/${domain}.conf`;
    await fs.writeFile(tempConfigPath, nginxConfig);
    
    // Copy to server
    await execAsync(`scp ${tempConfigPath} ${sshTarget}:/tmp/`);
    await execAsync(`ssh ${sshTarget} "sudo mv /tmp/${domain}.conf ${configPath}"`);
    
    // Enable site
    await execAsync(`ssh ${sshTarget} "sudo ln -sf ${configPath} /etc/nginx/sites-enabled/"`);
    
    // Test and reload Nginx
    await execAsync(`ssh ${sshTarget} "sudo nginx -t && sudo systemctl reload nginx"`);
    
    // Clean up local temp file
    await fs.unlink(tempConfigPath);
    
    console.log('✅ Nginx configured successfully');
    
    return {
      success: true,
      configPath,
      domain
    };
  } catch (error) {
    console.error('❌ Nginx configuration failed:', error.message);
    throw new Error(`Nginx configuration failed: ${error.message}`);
  }
};

/**
 * Setup SSL certificate using Certbot
 * @param {string} domain - Full domain
 * @returns {Promise<Object>} SSL setup result
 */
export const setupSSL = async (domain) => {
  const sshTarget = `${DEPLOY_USER}@${DEPLOY_SERVER}`;
  
  console.log(`🔒 Setting up SSL for ${domain}...`);
  
  try {
    await execAsync(`ssh ${sshTarget} "sudo certbot --nginx -d ${domain} --non-interactive --agree-tos --email admin@swigs.online"`, {
      timeout: 120000
    });
    
    console.log('✅ SSL certificate installed');
    
    return {
      success: true,
      domain,
      ssl: true
    };
  } catch (error) {
    console.warn('⚠️ SSL setup failed (may need manual intervention):', error.message);
    return {
      success: false,
      domain,
      ssl: false,
      error: error.message
    };
  }
};

/**
 * Full deployment pipeline
 * @param {Object} siteConfig - Site configuration
 * @param {Array} generatedFiles - Generated files
 * @returns {Promise<Object>} Deployment result
 */
export const deployFullSite = async (siteConfig, generatedFiles) => {
  const { siteSlug, siteDomain } = siteConfig;
  const domain = siteDomain || `${siteSlug}.swigs.online`;
  
  console.log(`\n🚀 Starting full deployment for ${domain}...`);
  console.log('='.repeat(50));
  
  const result = {
    siteSlug,
    domain,
    steps: [],
    success: false,
    url: null
  };
  
  try {
    // Step 1: Create deployment package
    const packageDir = await createDeploymentPackage(siteConfig, generatedFiles);
    result.steps.push({ step: 'package', success: true });
    
    // Step 2: Build the site
    const distPath = await buildSite(packageDir);
    result.steps.push({ step: 'build', success: true });
    
    // Step 3: Deploy to server
    const deployResult = await deployToServer(distPath, siteSlug);
    result.steps.push({ step: 'deploy', success: true, ...deployResult });
    
    // Step 4: Configure Nginx
    const nginxResult = await configureNginx(siteSlug, domain);
    result.steps.push({ step: 'nginx', success: true, ...nginxResult });
    
    // Step 5: Setup SSL (optional, may fail)
    const sslResult = await setupSSL(domain);
    result.steps.push({ step: 'ssl', ...sslResult });
    
    // Cleanup temp files
    await fs.rm(packageDir, { recursive: true, force: true });
    
    result.success = true;
    result.url = `https://${domain}`;
    
    console.log('='.repeat(50));
    console.log(`✅ Deployment complete! Site available at: ${result.url}`);
    
  } catch (error) {
    console.error('❌ Deployment pipeline failed:', error.message);
    result.error = error.message;
  }
  
  return result;
};

/**
 * Check deployment status
 * @param {string} domain - Domain to check
 * @returns {Promise<Object>} Status result
 */
export const checkDeploymentStatus = async (domain) => {
  try {
    const response = await fetch(`https://${domain}`, { 
      method: 'HEAD',
      timeout: 10000 
    });
    
    return {
      domain,
      online: response.ok,
      status: response.status,
      ssl: true
    };
  } catch (error) {
    // Try HTTP
    try {
      const response = await fetch(`http://${domain}`, { 
        method: 'HEAD',
        timeout: 10000 
      });
      
      return {
        domain,
        online: response.ok,
        status: response.status,
        ssl: false
      };
    } catch (httpError) {
      return {
        domain,
        online: false,
        error: error.message
      };
    }
  }
};

export default {
  generateNginxConfig,
  createDeploymentPackage,
  buildSite,
  deployToServer,
  configureNginx,
  setupSSL,
  deployFullSite,
  checkDeploymentStatus
};
