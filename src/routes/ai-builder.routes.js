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
 * Take a screenshot of a website
 */
const takeScreenshot = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
    return screenshot;
  } catch (error) {
    console.error('Screenshot error:', error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
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

    // Take screenshot
    console.log(`📸 Taking screenshot of ${url}...`);
    const screenshot = await takeScreenshot(url);
    
    if (!screenshot) {
      // Return mock data if screenshot fails
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

    // Analyze with Qwen
    console.log(`🔍 Analyzing with Qwen3-VL...`);
    const analysis = await analyzeWebsiteWithQwen(
      [{ page: 'home', screenshot }],
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
