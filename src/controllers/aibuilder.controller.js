import Stripe from 'stripe';
import path from 'path';
import fs from 'fs/promises';
import Site from '../models/Site.js';
import { generateWebsiteContent, regenerateWithFeedback, analyzeWebsiteWithVision } from '../services/claude.service.js';
import { analyzeWithDeepSeekOCR, checkDeepSeekHealth } from '../services/deepseek-ocr.service.js';
import { analyzeWebsiteWithQwen, checkQwenHealth, generateClaudePrompt } from '../services/qwen-vl.service.js';
import { scrapeWebsite } from '../services/scraper.service.js';
import { captureWebsiteScreenshots } from '../services/screenshot.service.js';
import { processMultipleImages } from '../services/image.service.js';

// Site slug for AI Builder Stripe config
const AI_BUILDER_SITE_SLUG = 'selfnodes';

/**
 * Get Stripe config from selfnodes site
 */
const getStripeConfig = async () => {
  const site = await Site.findOne({ slug: AI_BUILDER_SITE_SLUG })
    .select('+stripeConfig.secretKey +stripeConfig.webhookSecret');
  
  if (!site || !site.stripeConfig?.secretKey) {
    throw new Error('Stripe configuration not found');
  }
  
  return site.stripeConfig;
};

/**
 * @desc    Generate website preview using AI
 * @route   POST /api/ai-builder/generate
 * @access  Public
 */
export const generatePreview = async (req, res) => {
  try {
    const { domain, type, businessType, description, style, improvements, email } = req.body;

    if (!domain || !email) {
      return res.status(400).json({
        success: false,
        message: 'Domain and email are required'
      });
    }

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For modernization, capture screenshots and analyze
    let existingSiteData = null;
    let visionAnalysis = null;
    let deepseekAnalysis = null;
    
    // Collect user info for analysis
    const userInfo = {
      email,
      improvements,
      style,
      businessType,
      description
    };
    
    let qwenAnalysis = null;
    
    if (type === 'modernization') {
      console.log(`📸 Capturing screenshots of: ${domain}`);
      
      try {
        // Capture screenshots of the existing website
        const screenshots = await captureWebsiteScreenshots(domain);
        
        if (screenshots.length > 0) {
          // Step 1: Try Qwen3-VL first (local, free, full analysis + creative brief)
          const qwenHealth = await checkQwenHealth();
          if (qwenHealth.available) {
            console.log(`🔍 Analyzing ${screenshots.length} screenshots with Qwen3-VL (local)...`);
            qwenAnalysis = await analyzeWebsiteWithQwen(screenshots, domain, userInfo);
            console.log('✅ Qwen3-VL analysis complete');
            
            // Qwen3-VL provides full analysis, no need for DeepSeek or Claude Vision
            if (qwenAnalysis && !qwenAnalysis.error) {
              deepseekAnalysis = qwenAnalysis; // Use same format for compatibility
            }
          }
          
          // Step 2: Fallback to DeepSeek-OCR if Qwen3-VL not available
          if (!qwenAnalysis || qwenAnalysis.error) {
            const deepseekHealth = await checkDeepSeekHealth();
            if (deepseekHealth.available) {
              console.log(`🔍 Falling back to DeepSeek-OCR for ${screenshots.length} screenshots...`);
              deepseekAnalysis = await analyzeWithDeepSeekOCR(screenshots, domain);
              console.log('✅ DeepSeek-OCR analysis complete');
            }
          }
          
          // Step 3: Fallback to Claude Vision if all local models fail
          if (!deepseekAnalysis || deepseekAnalysis.error) {
            console.log(`🔍 Falling back to Claude Vision for ${screenshots.length} screenshots...`);
            visionAnalysis = await analyzeWebsiteWithVision(screenshots, domain);
          }
        }
      } catch (screenshotError) {
        console.error('Screenshot/Analysis error, falling back to scraping:', screenshotError.message);
      }
      
      // Fallback to text scraping if all analysis fails
      if (!visionAnalysis && !deepseekAnalysis && !qwenAnalysis) {
        console.log(`🔍 Falling back to text scraping for: ${domain}`);
        existingSiteData = await scrapeWebsite(domain);
      }
    }
    
    let generatedContent = null;
    
    // Check if Claude API is configured
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // If Qwen3-VL provided a full analysis, use it to enrich the prompt
        const analysisForClaude = qwenAnalysis?.analysis || deepseekAnalysis;
        
        generatedContent = await generateWebsiteContent({
          domain,
          type,
          businessType: businessType || qwenAnalysis?.analysis?.extractedInfo?.businessType || deepseekAnalysis?.structured?.businessType || visionAnalysis?.businessType || existingSiteData?.detectedBusinessType,
          description,
          style,
          improvements,
          email,
          existingSiteData,
          visionAnalysis,
          deepseekAnalysis: analysisForClaude, // Pass Qwen3-VL or DeepSeek analysis to Claude
          qwenAnalysis, // Pass full Qwen3-VL analysis if available
        });
      } catch (claudeError) {
        console.error('Claude API Error (falling back to mock):', claudeError.message);
      }
    }
    
    // Fallback to mock data if Claude not available - SIMPLIFIED for preview
    if (!generatedContent) {
      const siteName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      const extractedInfo = qwenAnalysis?.analysis?.extractedInfo || {};
      const creativeBrief = qwenAnalysis?.analysis?.creativeBrief || {};
      const services = extractedInfo.services || ['Conseil', 'Accompagnement', 'Support'];
      const usps = creativeBrief.uniqueSellingPoints || ['Qualité', 'Expertise', 'Service'];
      
      generatedContent = {
        siteName: extractedInfo.businessName || siteName,
        tagline: qwenAnalysis?.analysis?.suggestedTagline || extractedInfo.tagline || 'Votre partenaire de confiance',
        description: extractedInfo.description || `Site professionnel pour ${businessType || 'votre entreprise'}`,
        colors: creativeBrief.colors || {
          primary: '#0ea5e9',
          secondary: '#1e293b',
          accent: '#f59e0b',
        },
        hero: {
          title: extractedInfo.businessName || siteName,
          subtitle: extractedInfo.tagline || creativeBrief.objective || 'Bienvenue sur notre site',
          cta: 'Découvrir nos services'
        },
        features: usps.slice(0, 3).map((point, i) => ({
          icon: ['shield', 'zap', 'star'][i],
          title: point,
          description: `${point} - Un engagement fort envers nos clients`
        })),
        services: services.slice(0, 4).map(service => ({
          title: service,
          description: `Découvrez notre offre ${service}`
        })),
        about: {
          title: 'À propos',
          content: extractedInfo.description || `${siteName} est votre partenaire de confiance depuis de nombreuses années.`,
          stats: [
            { value: '10+', label: 'Années d\'expérience' },
            { value: '500+', label: 'Clients satisfaits' }
          ]
        },
        testimonial: {
          quote: 'Un service exceptionnel et une équipe à l\'écoute. Je recommande vivement !',
          author: 'Client satisfait',
          role: 'Suisse'
        },
        contact: {
          phone: extractedInfo.contactInfo?.phone || '+41 XX XXX XX XX',
          email: extractedInfo.contactInfo?.email || email || `contact@${domain}`,
          address: extractedInfo.contactInfo?.address || 'Suisse'
        },
        seo: qwenAnalysis?.analysis?.seo || {
          title: `${extractedInfo.businessName || siteName} - Site officiel`,
          description: `Découvrez ${extractedInfo.businessName || domain}`,
          keywords: [businessType, 'suisse', domain.split('.')[0]],
        },
      };
      console.log('⚠️ Using simplified mock data with Qwen3-VL analysis');
    }
    
    const generationResult = {
      projectId,
      domain,
      type,
      status: 'preview_ready',
      previewUrl: `https://preview.swigs.online/${domain.replace(/\./g, '-')}`,
      generatedAt: new Date(),
      content: generatedContent,
      visionAnalysis: visionAnalysis ? {
        siteName: visionAnalysis.siteName,
        businessType: visionAnalysis.businessType,
        currentDesign: visionAnalysis.currentDesign,
        strengths: visionAnalysis.strengths,
        weaknesses: visionAnalysis.weaknesses,
        recommendations: visionAnalysis.recommendations,
      } : null,
      qwenAnalysis: qwenAnalysis ? {
        extractedInfo: qwenAnalysis.analysis?.extractedInfo,
        creativeBrief: qwenAnalysis.analysis?.creativeBrief,
        seo: qwenAnalysis.analysis?.seo,
        suggestedTagline: qwenAnalysis.analysis?.suggestedTagline,
        model: qwenAnalysis.model,
      } : null,
      config: {
        businessType: businessType || visionAnalysis?.businessType,
        description,
        style,
        improvements,
      },
      features: [
        'Design responsive',
        'Optimisation SEO',
        'Formulaire de contact',
        'Hébergement Suisse premium',
      ],
    };

    res.status(200).json({
      success: true,
      data: generationResult
    });

  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating preview',
      error: error.message
    });
  }
};

/**
 * @desc    Request modifications to generated preview
 * @route   POST /api/ai-builder/regenerate
 * @access  Public
 */
export const regeneratePreview = async (req, res) => {
  try {
    const { projectId, feedback } = req.body;

    if (!projectId || !feedback) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and feedback are required'
      });
    }

    // TODO: Use Claude API to regenerate based on feedback
    
    res.status(200).json({
      success: true,
      data: {
        projectId,
        status: 'regenerating',
        message: 'Modifications en cours de traitement',
        estimatedTime: '30 seconds'
      }
    });

  } catch (error) {
    console.error('Regeneration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating preview',
      error: error.message
    });
  }
};

/**
 * @desc    Create Stripe checkout session for AI Builder
 * @route   POST /api/ai-builder/checkout
 * @access  Public
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { projectId, domain, plan, billingCycle, email } = req.body;

    if (!projectId || !domain || !plan || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const stripeConfig = await getStripeConfig();
    const stripe = new Stripe(stripeConfig.secretKey);

    // Define pricing
    const pricing = {
      starter: { monthly: 49, yearly: 490 },
      pro: { monthly: 99, yearly: 990 },
      business: { monthly: 199, yearly: 1990 }
    };

    const planPricing = pricing[plan];
    if (!planPricing) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    const amount = billingCycle === 'yearly' ? planPricing.yearly : planPricing.monthly;
    const isRecurring = billingCycle === 'monthly';

    // Create Stripe checkout session
    const sessionConfig = {
      payment_method_types: ['card'],
      customer_email: email,
      metadata: {
        projectId,
        domain,
        plan,
        billingCycle,
        type: 'ai-builder'
      },
      success_url: `${req.headers.origin || 'http://localhost:5180'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5180'}/checkout?cancelled=true`,
    };

    if (isRecurring) {
      // Create a price for subscription
      const price = await stripe.prices.create({
        unit_amount: amount * 100, // Stripe uses cents
        currency: 'chf',
        recurring: { interval: 'month' },
        product_data: {
          name: `AI Builder - ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
          description: `Site web ${domain} - Abonnement mensuel`,
        },
      });

      sessionConfig.mode = 'subscription';
      sessionConfig.line_items = [{
        price: price.id,
        quantity: 1,
      }];
    } else {
      // One-time payment for yearly
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [{
        price_data: {
          currency: 'chf',
          product_data: {
            name: `AI Builder - ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
            description: `Site web ${domain} - Paiement annuel`,
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating checkout session',
      error: error.message
    });
  }
};

/**
 * @desc    Handle Stripe webhook for AI Builder
 * @route   POST /api/ai-builder/webhook
 * @access  Public (Stripe signature verified)
 */
export const handleWebhook = async (req, res) => {
  try {
    const stripeConfig = await getStripeConfig();
    const stripe = new Stripe(stripeConfig.secretKey);
    
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        stripeConfig.webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('✅ AI Builder Payment successful:', session.metadata);
        
        // TODO: 
        // 1. Create the site in the database
        // 2. Trigger deployment process
        // 3. Send confirmation email
        // 4. Register domain if needed
        
        break;

      case 'customer.subscription.created':
        console.log('✅ AI Builder Subscription created');
        break;

      case 'customer.subscription.deleted':
        console.log('⚠️ AI Builder Subscription cancelled');
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing error',
      error: error.message
    });
  }
};

/**
 * @desc    Get project status
 * @route   GET /api/ai-builder/project/:projectId
 * @access  Public
 */
export const getProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;

    // TODO: Fetch from database
    // For now, return mock data
    
    res.status(200).json({
      success: true,
      data: {
        projectId,
        status: 'preview_ready',
        domain: 'example.ch',
        previewUrl: 'https://preview.swigs.online/example-ch',
        createdAt: new Date(),
      }
    });

  } catch (error) {
    console.error('Get Project Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
      error: error.message
    });
  }
};

/**
 * @desc    Get Stripe publishable key for frontend
 * @route   GET /api/ai-builder/stripe-key
 * @access  Public
 */
export const getStripePublishableKey = async (req, res) => {
  try {
    const site = await Site.findOne({ slug: AI_BUILDER_SITE_SLUG });
    
    if (!site || !site.stripeConfig?.publishableKey) {
      return res.status(404).json({
        success: false,
        message: 'Stripe configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        publishableKey: site.stripeConfig.publishableKey
      }
    });

  } catch (error) {
    console.error('Get Stripe Key Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Stripe key',
      error: error.message
    });
  }
};

/**
 * @desc    Upload images for AI Builder with WebP conversion
 * @route   POST /api/ai-builder/upload
 * @access  Public
 */
export const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { projectId } = req.body;
    
    // Create upload directory for AI Builder projects
    const baseUploadPath = process.env.UPLOAD_PATH || '/var/www/uploads';
    const projectUploadPath = path.join(baseUploadPath, 'ai-builder', projectId || 'temp');
    
    // Process and convert images to WebP
    const results = await processMultipleImages(req.files, projectUploadPath, 'ai-');
    
    // Build URLs for the uploaded images
    const uploadsBaseDomain = (process.env.UPLOADS_DOMAIN || 'swigs.online').replace(/^https?:\/\//, '');
    
    const uploadedImages = results
      .filter(r => r.filename)
      .map(r => ({
        url: `https://${uploadsBaseDomain}/uploads/ai-builder/${projectId || 'temp'}/${r.filename}`,
        originalName: r.originalName,
        info: r.info,
      }));

    res.status(200).json({
      success: true,
      data: {
        images: uploadedImages,
        count: uploadedImages.length,
      }
    });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message
    });
  }
};

/**
 * @desc    Regenerate with images - accepts feedback and image URLs
 * @route   POST /api/ai-builder/regenerate-with-images
 * @access  Public
 */
export const regenerateWithImages = async (req, res) => {
  try {
    const { projectId, feedback, currentContent, imageUrls } = req.body;

    if (!projectId || !feedback) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and feedback are required'
      });
    }

    let updatedContent = currentContent;
    
    // Use Claude to regenerate with feedback
    if (process.env.ANTHROPIC_API_KEY && currentContent) {
      try {
        // Add image context to feedback if images were uploaded
        let enhancedFeedback = feedback;
        if (imageUrls && imageUrls.length > 0) {
          enhancedFeedback += `\n\nL'utilisateur a fourni ${imageUrls.length} image(s) à intégrer dans le design.`;
        }
        
        updatedContent = await regenerateWithFeedback(currentContent, enhancedFeedback);
        
        // Add image URLs to the content if provided
        if (imageUrls && imageUrls.length > 0) {
          updatedContent.userImages = imageUrls;
        }
      } catch (claudeError) {
        console.error('Claude regeneration error:', claudeError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        projectId,
        status: 'preview_ready',
        content: updatedContent,
        message: 'Modifications appliquées'
      }
    });

  } catch (error) {
    console.error('Regeneration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating preview',
      error: error.message
    });
  }
};
