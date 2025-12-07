/**
 * AI Builder Routes
 * Main routes for the AI website builder
 */

import express from 'express';
import { analyzeWebsiteWithQwen } from '../services/qwen-vl.service.js';
import puppeteer from 'puppeteer';

const router = express.Router();

// Stripe key (from env)
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';

/**
 * Helper function to wait (replacement for deprecated waitForTimeout)
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Take a full-page screenshot of a website
 * Handles popups, cookie banners, and age verification
 */
const takeScreenshot = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate
    console.log(`📸 Navigating to ${url}...`);
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Wait for page to render
    await delay(2000);
    
    // Try to close common popups/modals/cookie banners
    console.log(`🔍 Looking for popups to close...`);
    await page.evaluate(() => {
      // Common popup/modal selectors
      const popupSelectors = [
        // Age verification buttons (click "Yes", "Oui", "Enter", etc.)
        'button:contains("Oui")', 'button:contains("Yes")', 'button:contains("Enter")',
        '[class*="age-verify"] button', '[class*="age-gate"] button',
        '[id*="age-verify"] button', '[id*="age-gate"] button',
        // Cookie consent
        '[class*="cookie"] button[class*="accept"]',
        '[class*="cookie"] button[class*="agree"]',
        '[id*="cookie"] button',
        'button[class*="accept-cookies"]',
        '.cc-btn.cc-dismiss',
        '#onetrust-accept-btn-handler',
        // Generic close buttons
        '[class*="modal"] [class*="close"]',
        '[class*="popup"] [class*="close"]',
        '[aria-label="Close"]',
        '.close-modal', '.close-popup',
        // Shopify specific
        '.shopify-section-popup button',
        '[class*="newsletter"] button[class*="close"]'
      ];
      
      // Try clicking buttons with specific text
      const buttons = document.querySelectorAll('button, a.btn, [role="button"]');
      buttons.forEach(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('oui') || text.includes('yes') || text.includes('enter') || 
            text.includes('accept') || text.includes('agree') || text.includes('j\'accepte') ||
            text.includes('continuer') || text.includes('continue')) {
          try { btn.click(); } catch(e) {}
        }
      });
      
      // Try clicking close buttons
      popupSelectors.forEach(selector => {
        try {
          const el = document.querySelector(selector);
          if (el) el.click();
        } catch(e) {}
      });
      
      // Remove overlay elements
      const overlays = document.querySelectorAll('[class*="overlay"], [class*="modal"], [class*="popup"], [class*="age-gate"]');
      overlays.forEach(el => {
        try { el.remove(); } catch(e) {}
      });
    });
    
    // Wait after closing popups
    await delay(1500);
    
    // Scroll to load lazy content
    console.log(`📜 Scrolling page...`);
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const maxScrolls = 20;
        let scrollCount = 0;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;
          if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 150);
      });
    });
    
    await delay(1000);
    
    // Take screenshot
    const screenshot = await page.screenshot({ 
      type: 'jpeg', 
      quality: 90,
      fullPage: true
    });
    
    console.log(`📸 Screenshot captured: ${(screenshot.length / 1024).toFixed(1)}KB`);
    return screenshot;
  } catch (error) {
    console.error('Screenshot error:', error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};

/**
 * Take screenshots of multiple pages of a website
 * Detects navigation links and captures main pages
 */
const takeMultiPageScreenshots = async (baseUrl) => {
  let browser;
  const screenshots = [];
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to homepage
    console.log(`📸 [Multi] Navigating to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);
    
    // Close popups
    await closePopups(page);
    await delay(1500);
    
    // Take homepage screenshot
    const homeScreenshot = await page.screenshot({ type: 'jpeg', quality: 90, fullPage: true });
    screenshots.push({ page: 'home', url: baseUrl, screenshot: homeScreenshot });
    console.log(`📸 [Multi] Homepage captured: ${(homeScreenshot.length / 1024).toFixed(1)}KB`);
    
    // Extract navigation links
    const navLinks = await page.evaluate((baseUrl) => {
      const links = [];
      const baseHost = new URL(baseUrl).host;
      
      // Find navigation elements
      const navSelectors = ['nav a', 'header a', '[class*="nav"] a', '[class*="menu"] a', '.navbar a'];
      const seenUrls = new Set();
      
      navSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(link => {
          try {
            const href = link.href;
            if (!href || seenUrls.has(href)) return;
            
            const url = new URL(href);
            // Only internal links
            if (url.host !== baseHost) return;
            // Skip anchors, javascript, tel, mailto
            if (href.startsWith('javascript:') || href.startsWith('tel:') || 
                href.startsWith('mailto:') || href.includes('#')) return;
            // Skip homepage
            if (url.pathname === '/' || url.pathname === '') return;
            
            const text = link.textContent?.trim().toLowerCase() || '';
            const path = url.pathname.toLowerCase();
            
            // Prioritize important pages
            const priority = 
              (text.includes('service') || path.includes('service')) ? 1 :
              (text.includes('about') || text.includes('propos') || path.includes('about')) ? 2 :
              (text.includes('contact') || path.includes('contact')) ? 3 :
              (text.includes('shop') || text.includes('boutique') || path.includes('shop') || path.includes('products')) ? 1 :
              (text.includes('menu') || path.includes('menu')) ? 2 :
              (text.includes('galerie') || text.includes('gallery') || path.includes('gallery')) ? 4 :
              (text.includes('team') || text.includes('equipe') || path.includes('team')) ? 5 :
              10;
            
            seenUrls.add(href);
            links.push({ 
              url: href, 
              text: link.textContent?.trim() || path,
              priority 
            });
          } catch(e) {}
        });
      });
      
      // Sort by priority and limit to 4 pages
      return links.sort((a, b) => a.priority - b.priority).slice(0, 4);
    }, baseUrl);
    
    console.log(`🔗 [Multi] Found ${navLinks.length} navigation links:`, navLinks.map(l => l.text));
    
    // Capture each page
    for (const link of navLinks) {
      try {
        console.log(`📸 [Multi] Capturing ${link.text} (${link.url})...`);
        await page.goto(link.url, { waitUntil: 'networkidle2', timeout: 20000 });
        await delay(1500);
        await closePopups(page);
        await delay(500);
        
        const pageScreenshot = await page.screenshot({ type: 'jpeg', quality: 85, fullPage: true });
        const pageName = link.text.toLowerCase()
          .replace(/[àáâã]/g, 'a').replace(/[èéêë]/g, 'e')
          .replace(/[ìíîï]/g, 'i').replace(/[òóôõ]/g, 'o')
          .replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-').replace(/^-|-$/g, '') || 'page';
        
        screenshots.push({ 
          page: pageName, 
          url: link.url, 
          screenshot: pageScreenshot 
        });
        console.log(`📸 [Multi] ${link.text} captured: ${(pageScreenshot.length / 1024).toFixed(1)}KB`);
      } catch (err) {
        console.warn(`⚠️ [Multi] Failed to capture ${link.text}: ${err.message}`);
      }
    }
    
    console.log(`✅ [Multi] Total pages captured: ${screenshots.length}`);
    return screenshots;
    
  } catch (error) {
    console.error('Multi-page screenshot error:', error.message);
    return screenshots.length > 0 ? screenshots : null;
  } finally {
    if (browser) await browser.close();
  }
};

/**
 * Helper to close popups on a page
 */
const closePopups = async (page) => {
  await page.evaluate(() => {
    // Click accept/yes buttons
    const buttons = document.querySelectorAll('button, a.btn, [role="button"]');
    buttons.forEach(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      if (text.includes('oui') || text.includes('yes') || text.includes('enter') || 
          text.includes('accept') || text.includes('agree') || text.includes('j\'accepte') ||
          text.includes('continuer') || text.includes('continue')) {
        try { btn.click(); } catch(e) {}
      }
    });
    
    // Remove overlays
    const overlays = document.querySelectorAll('[class*="overlay"], [class*="modal"], [class*="popup"], [class*="age-gate"]');
    overlays.forEach(el => { try { el.remove(); } catch(e) {} });
  });
};

/**
 * Generate website preview
 * POST /api/ai-builder/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { domain, email, phone, improvements, style, budget } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }

    console.log(`🚀 Starting generation for ${domain}`);

    // Normalize domain
    let url = domain;
    if (!url.startsWith('http')) {
      url = `https://${domain}`;
    }

    // Take multi-page screenshots
    console.log(`📸 Taking multi-page screenshots of ${url}...`);
    const screenshots = await takeMultiPageScreenshots(url);
    
    if (!screenshots || screenshots.length === 0) {
      // Fallback to single screenshot
      console.log('⚠️ Multi-page failed, trying single screenshot...');
      const singleScreenshot = await takeScreenshot(url);
      
      if (!singleScreenshot) {
        console.log('⚠️ Screenshot failed, using mock data');
        return res.json({
          success: true,
          data: {
            projectId: `proj_${Date.now()}`,
            content: generateMockContent(domain),
            status: 'completed'
          }
        });
      }
      
      screenshots.push({ page: 'home', screenshot: singleScreenshot });
    }

    // Analyze with Qwen (send all screenshots)
    console.log(`🔍 Analyzing ${screenshots.length} pages with Qwen3-VL...`);
    const analysis = await analyzeWebsiteWithQwen(
      screenshots,
      domain,
      { email, phone, improvements, style, budget }
    );

    if (analysis.error) {
      console.log('⚠️ Qwen analysis failed, using mock data');
      return res.json({
        success: true,
        data: {
          projectId: `proj_${Date.now()}`,
          content: generateMockContent(domain),
          status: 'completed'
        }
      });
    }

    // Transform analysis to content
    const content = transformAnalysisToContent(analysis, domain);

    console.log(`✅ Generation complete for ${domain}`);

    res.json({
      success: true,
      data: {
        projectId: `proj_${Date.now()}`,
        content,
        analysis: analysis.analysis,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Generation failed'
    });
  }
});

/**
 * Regenerate with feedback
 * POST /api/ai-builder/regenerate
 */
router.post('/regenerate', async (req, res) => {
  try {
    const { projectId, feedback, domain } = req.body;
    
    console.log(`🔄 Regenerating ${projectId} with feedback: ${feedback}`);

    // For now, return mock data with slight variations
    const content = generateMockContent(domain || 'example.com');
    content.hero.title = `${content.hero.title} - Amélioré`;

    res.json({
      success: true,
      data: {
        projectId: projectId || `proj_${Date.now()}`,
        content,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('Regeneration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Regeneration failed'
    });
  }
});

/**
 * Get project status
 * GET /api/ai-builder/project/:id
 */
router.get('/project/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      data: {
        projectId: id,
        status: 'completed',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Project status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get project status'
    });
  }
});

/**
 * Get Stripe publishable key
 * GET /api/ai-builder/stripe-key
 */
router.get('/stripe-key', (req, res) => {
  res.json({
    success: true,
    publishableKey: STRIPE_PUBLISHABLE_KEY
  });
});

/**
 * Create checkout session
 * POST /api/ai-builder/checkout
 */
router.post('/checkout', async (req, res) => {
  try {
    const { projectId, plan, email } = req.body;
    
    // TODO: Implement Stripe checkout
    res.json({
      success: true,
      sessionId: `cs_${Date.now()}`,
      url: `https://checkout.stripe.com/placeholder`
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Checkout failed'
    });
  }
});

/**
 * Upload image
 * POST /api/ai-builder/upload
 */
router.post('/upload', async (req, res) => {
  try {
    // TODO: Implement file upload
    res.json({
      success: true,
      url: 'https://via.placeholder.com/400x300'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
});

/**
 * Transform Qwen analysis to site content
 */
function transformAnalysisToContent(analysis, domain) {
  const info = analysis.analysis?.extractedInfo || {};
  const brief = analysis.analysis?.creativeBrief || {};
  const seo = analysis.analysis?.seo || {};

  return {
    siteName: info.businessName || domain.replace(/\.(ch|com|fr|de)$/, ''),
    tagline: analysis.analysis?.suggestedTagline || info.tagline || 'Votre partenaire de confiance',
    designStyle: brief.siteType === 'portfolio' ? 'artistic' : 
                 brief.siteType === 'restaurant' ? 'elegant' : 'modern',
    colors: brief.colors || {
      primary: '#0ea5e9',
      secondary: '#1e293b',
      accent: '#f59e0b'
    },
    navigation: info.navigation || ['Accueil', 'Services', 'À propos', 'Contact'],
    hero: {
      title: info.businessName || 'Bienvenue',
      subtitle: info.tagline || brief.objective || 'Découvrez nos services',
      description: info.description || '',
      cta: { text: 'Découvrir', link: '#services' }
    },
    services: (info.services || []).map(s => ({
      title: s.title || s,
      description: s.description || ''
    })),
    features: brief.uniqueSellingPoints?.map(f => ({
      title: f,
      description: ''
    })) || [],
    about: {
      title: 'À propos',
      content: info.description || `${info.businessName || domain} est votre partenaire de confiance.`
    },
    contact: {
      email: info.contactInfo?.email || '',
      phone: info.contactInfo?.phone || '',
      address: info.contactInfo?.address || ''
    },
    testimonials: (info.testimonials || []).map(t => ({
      quote: t.quote,
      author: t.author,
      role: t.role
    })),
    seo: {
      title: seo.title || info.businessName || domain,
      description: seo.description || info.description || '',
      keywords: seo.keywords || []
    }
  };
}

/**
 * Generate mock content for testing
 */
function generateMockContent(domain) {
  const siteName = domain.replace(/\.(ch|com|fr|de|org|net)$/i, '')
    .split('.')[0]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    siteName,
    tagline: 'Excellence et innovation au service de votre réussite',
    designStyle: 'modern',
    colors: {
      primary: '#0ea5e9',
      secondary: '#1e293b',
      accent: '#f59e0b'
    },
    navigation: ['Accueil', 'Services', 'À propos', 'Contact'],
    hero: {
      title: `Bienvenue chez ${siteName}`,
      subtitle: 'Votre partenaire de confiance',
      description: 'Nous vous accompagnons dans tous vos projets avec expertise et passion.',
      cta: { text: 'Découvrir nos services', link: '#services' }
    },
    services: [
      { title: 'Conseil', description: 'Accompagnement personnalisé pour vos projets' },
      { title: 'Développement', description: 'Solutions sur mesure adaptées à vos besoins' },
      { title: 'Support', description: 'Assistance technique disponible 24/7' }
    ],
    features: [
      { title: 'Expertise', description: 'Plus de 10 ans d\'expérience' },
      { title: 'Qualité', description: 'Standards les plus élevés' },
      { title: 'Innovation', description: 'Technologies de pointe' }
    ],
    about: {
      title: 'À propos de nous',
      content: `${siteName} est une entreprise leader dans son domaine, dédiée à fournir des solutions de qualité supérieure à ses clients.`
    },
    contact: {
      email: `contact@${domain}`,
      phone: '+41 XX XXX XX XX',
      address: 'Suisse'
    },
    testimonials: [
      { quote: 'Service exceptionnel et équipe professionnelle.', author: 'Client satisfait', role: 'Entreprise' }
    ],
    seo: {
      title: siteName,
      description: `${siteName} - Excellence et innovation`,
      keywords: ['services', 'qualité', 'suisse']
    }
  };
}

export default router;
