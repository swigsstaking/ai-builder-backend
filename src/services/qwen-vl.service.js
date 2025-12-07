import axios from 'axios';

const QWEN_VL_URL = process.env.QWEN_VL_URL || 'http://192.168.110.103:8000/v1/chat/completions';
const QWEN_MODEL = process.env.QWEN_MODEL || 'Qwen/Qwen3-VL-8B-Instruct';

/**
 * Clean base64 string (remove newlines that cause errors)
 */
const cleanBase64 = (buffer) => {
  return buffer.toString('base64').replace(/[\r\n]/g, '');
};

/**
 * Analyze website screenshots and generate a creative brief
 * Qwen3-VL can do OCR + semantic analysis + creative brief in one call
 * @param {Array<{page: string, screenshot: Buffer}>} screenshots - Screenshots to analyze
 * @param {string} domain - Domain being analyzed
 * @param {Object} userInfo - Additional info provided by user (email, phone, improvements, etc.)
 * @returns {Promise<Object>} Complete creative brief for Claude
 */
export const analyzeWebsiteWithQwen = async (screenshots, domain, userInfo = {}) => {
  if (!screenshots || screenshots.length === 0) {
    console.log('⚠️ No screenshots to analyze');
    return null;
  }

  console.log(`🔍 Qwen3-VL: Analyzing ${screenshots.length} screenshots for ${domain}`);

  try {
    // Use the first (homepage) screenshot for main analysis
    const mainScreenshot = screenshots[0];
    const base64Image = cleanBase64(mainScreenshot.screenshot);

    // Build user info context
    const userInfoContext = Object.keys(userInfo).length > 0 
      ? `\n\nInformations fournies par l'utilisateur:
- Email: ${userInfo.email || 'Non fourni'}
- Téléphone: ${userInfo.phone || 'Non fourni'}
- Améliorations souhaitées: ${userInfo.improvements || 'Modernisation générale'}
- Style souhaité: ${userInfo.style || 'Moderne et professionnel'}
- Couleurs préférées: ${userInfo.colors || 'À déterminer'}
- Budget: ${userInfo.budget || 'Standard'}`
      : '';

    const response = await axios.post(QWEN_VL_URL, {
      model: QWEN_MODEL,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en création de sites web et en analyse UX/UI. Tu analyses des sites existants et génères des briefs créatifs structurés en JSON. Tes analyses sont précises, détaillées et orientées vers la création de sites web modernes et uniques. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` }
            },
            {
              type: 'text',
              text: `Analyse ce screenshot du site ${domain} et génère un brief créatif complet.${userInfoContext}

IMPORTANT - EXTRACTION DES COULEURS:
1. Identifie la couleur PRINCIPALE du site (boutons, liens, accents visuels) - doit etre une couleur vive/saturee
2. Identifie la couleur SECONDAIRE (fond, texte principal, navbar) - souvent sombre ou neutre
3. Identifie la couleur d'ACCENT (elements de mise en valeur, CTA secondaires)
4. Retourne les couleurs en format hexadecimal (#RRGGBB)
5. Si le site utilise du bleu, retourne le bleu exact. Si rouge, retourne le rouge exact, etc.

IMPORTANT - DETECTION DES SECTIONS:
Analyse le site et identifie quelles sections sont presentes parmi:
- hero: banniere principale avec titre/slogan
- features: liste d'atouts/avantages
- services: liste de services proposes
- products: grille de produits (e-commerce)
- gallery: galerie d'images/portfolio
- team: presentation de l'equipe
- testimonials: temoignages clients
- pricing: grille tarifaire
- faq: questions frequentes
- about: section a propos
- contact: formulaire/infos de contact

Retourne un JSON avec cette structure exacte:
{
  "extractedInfo": {
    "businessName": "nom de l'entreprise",
    "businessType": "type d'activite (restaurant, agence, e-commerce, portfolio, etc.)",
    "tagline": "slogan actuel si visible",
    "description": "description extraite du site",
    "navigation": ["liste", "des", "menus"],
    "services": [{"title": "Service 1", "description": "description"}],
    "products": [{"name": "Produit 1", "price": "prix si visible", "description": "description"}],
    "team": [{"name": "Nom", "role": "Poste"}],
    "testimonials": [{"quote": "citation", "author": "auteur", "role": "entreprise"}],
    "contactInfo": {
      "phone": "telephone si visible",
      "email": "email si visible",
      "address": "adresse si visible"
    },
    "openingHours": "horaires si visibles",
    "visualStyle": "description du style visuel actuel",
    "detectedColors": {
      "mainColor": "#hex de la couleur principale visible",
      "backgroundColor": "#hex du fond principal",
      "accentColor": "#hex de la couleur d'accent"
    },
    "detectedSections": ["hero", "services", "about", "contact"]
  },
  "creativeBrief": {
    "projectName": "Nom du projet de refonte",
    "objective": "Objectif de la refonte en 2-3 phrases",
    "targetAudience": "Public cible",
    "brandVoice": "Ton de communication recommande",
    "siteType": "landing | business | ecommerce | portfolio | restaurant | agency",
    "colors": {
      "primary": "#hex - DOIT etre la couleur principale du site original ou une version modernisee",
      "secondary": "#hex - couleur sombre pour texte/fond",
      "accent": "#hex - couleur vive pour CTA et accents"
    },
    "suggestedSections": ["navbar", "hero", "features", "services", "about", "testimonials", "cta", "contact", "footer"],
    "keyFeatures": ["fonctionnalites", "recommandees"],
    "uniqueSellingPoints": ["points", "forts", "a", "mettre", "en", "avant"]
  },
  "seo": {
    "title": "Titre SEO optimise",
    "description": "Meta description SEO",
    "keywords": ["mots", "cles", "pertinents"]
  },
  "suggestedTagline": "Nouveau slogan accrocheur"
}`
            }
          ]
        }
      ],
      max_tokens: 3000,
      temperature: 0.2
    }, {
      timeout: 120000 // 2 minutes timeout for complex analysis
    });

    const content = response.data.choices[0].message.content;
    console.log(`📊 Qwen3-VL: Raw response length: ${content.length} chars`);
    console.log(`📊 Qwen3-VL: Raw response preview:`, content.substring(0, 800));
    
    // Parse JSON response
    let analysisResult;
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
        console.log(`📊 Qwen3-VL: FULL Extracted info:`, JSON.stringify({
          businessName: analysisResult.extractedInfo?.businessName,
          businessType: analysisResult.extractedInfo?.businessType,
          tagline: analysisResult.extractedInfo?.tagline,
          description: analysisResult.extractedInfo?.description?.substring(0, 100),
          services: analysisResult.extractedInfo?.services?.length || 0,
          products: analysisResult.extractedInfo?.products?.length || 0,
          team: analysisResult.extractedInfo?.team?.length || 0,
          testimonials: analysisResult.extractedInfo?.testimonials?.length || 0,
          contactInfo: analysisResult.extractedInfo?.contactInfo,
          detectedColors: analysisResult.extractedInfo?.detectedColors,
          detectedSections: analysisResult.extractedInfo?.detectedSections,
          siteType: analysisResult.creativeBrief?.siteType,
          recommendedColors: analysisResult.creativeBrief?.colors,
          suggestedSections: analysisResult.creativeBrief?.suggestedSections
        }, null, 2));
        
        // Log colors and sections specifically for debugging
        console.log(`🎨 Qwen3-VL: Detected colors:`, analysisResult.extractedInfo?.detectedColors);
        console.log(`🎨 Qwen3-VL: Recommended colors:`, analysisResult.creativeBrief?.colors);
        console.log(`📑 Qwen3-VL: Detected sections:`, analysisResult.extractedInfo?.detectedSections);
        console.log(`📑 Qwen3-VL: Suggested sections:`, analysisResult.creativeBrief?.suggestedSections);
        console.log(`🏢 Qwen3-VL: Site type:`, analysisResult.creativeBrief?.siteType);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('⚠️ Could not parse JSON, using raw content');
      console.warn('⚠️ Raw content preview:', content.substring(0, 800));
      analysisResult = { rawContent: content };
    }

    console.log(`✅ Qwen3-VL: Analysis complete for ${domain}`);
    
    return {
      domain,
      analysis: analysisResult,
      userInfo,
      screenshotCount: screenshots.length,
      model: QWEN_MODEL,
      analyzedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Qwen3-VL error:', error.message);
    
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
    
    return {
      domain,
      error: error.message,
      fallback: true
    };
  }
};

/**
 * Generate an optimized prompt for Claude based on analysis
 * @param {Object} analysis - Analysis from analyzeWebsiteWithQwen
 * @param {Object} userInfo - User provided information
 * @returns {Promise<string>} Optimized prompt for Claude
 */
export const generateClaudePrompt = async (analysis, userInfo = {}) => {
  console.log('📝 Qwen3-VL: Generating optimized prompt for Claude');

  try {
    const response = await axios.post(QWEN_VL_URL, {
      model: QWEN_MODEL,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en prompt engineering spécialisé dans la création de prompts pour Claude (Anthropic). Tu génères des prompts optimisés, détaillés et structurés pour créer des sites web professionnels. Tes prompts doivent être clairs, précis et inclure toutes les informations nécessaires.`
        },
        {
          role: 'user',
          content: `Génère un prompt optimisé pour Claude afin de créer un site web basé sur cette analyse:

ANALYSE DU SITE EXISTANT:
${JSON.stringify(analysis.analysis || analysis, null, 2)}

INFORMATIONS UTILISATEUR:
- Email: ${userInfo.email || 'Non fourni'}
- Téléphone: ${userInfo.phone || 'Non fourni'}
- Améliorations: ${userInfo.improvements || 'Modernisation générale'}
- Style: ${userInfo.style || 'Moderne et professionnel'}
- Couleurs: ${userInfo.colors || 'À déterminer selon l\'analyse'}

Génère un prompt complet et optimisé pour Claude qui:
1. Décrit précisément le site à créer
2. Inclut toutes les sections recommandées
3. Spécifie le style visuel et les couleurs
4. Détaille les fonctionnalités requises
5. Inclut les informations de contact
6. Optimise pour le SEO
7. Demande un JSON structuré en sortie

Le prompt doit être en français et prêt à être envoyé directement à Claude.`
        }
      ],
      max_tokens: 2500,
      temperature: 0.3
    }, {
      timeout: 90000
    });

    const prompt = response.data.choices[0].message.content;
    console.log('✅ Qwen3-VL: Claude prompt generated');
    
    return prompt;

  } catch (error) {
    console.error('❌ Qwen3-VL prompt generation error:', error.message);
    return null;
  }
};

/**
 * Simple OCR extraction (fallback to basic text extraction)
 */
export const extractTextFromImage = async (imageBuffer) => {
  const base64Image = cleanBase64(imageBuffer);
  
  const response = await axios.post(QWEN_VL_URL, {
    model: QWEN_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          },
          { 
            type: 'text', 
            text: 'Extrais tout le texte visible de cette image. Retourne uniquement le texte, sans commentaires.' 
          }
        ]
      }
    ],
    max_tokens: 4096,
    temperature: 0.0
  }, {
    timeout: 60000
  });

  return response.data.choices[0].message.content;
};

/**
 * Health check for Qwen3-VL service
 */
export const checkQwenHealth = async () => {
  try {
    const baseUrl = QWEN_VL_URL.replace('/v1/chat/completions', '');
    const response = await axios.get(`${baseUrl}/v1/models`, {
      timeout: 5000
    });
    const hasModel = response.data?.data?.some(m => m.id.includes('Qwen'));
    return { 
      available: hasModel, 
      status: response.status, 
      models: response.data?.data?.map(m => m.id) || [],
      url: baseUrl
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
};

/**
 * Full pipeline: Analyze + Generate Claude Prompt
 * This is the main function to use for the AI Builder
 */
export const analyzeAndGeneratePrompt = async (screenshots, domain, userInfo = {}) => {
  // Step 1: Analyze website
  const analysis = await analyzeWebsiteWithQwen(screenshots, domain, userInfo);
  
  if (analysis.error || analysis.fallback) {
    return analysis;
  }

  // Step 2: Generate optimized Claude prompt
  const claudePrompt = await generateClaudePrompt(analysis, userInfo);

  return {
    ...analysis,
    claudePrompt,
    pipeline: 'qwen3-vl'
  };
};

/**
 * Analyze multiple pages and generate content for each
 * @param {Array<{page: string, screenshot: Buffer, url: string}>} screenshots - Screenshots with page info
 * @param {string} domain - Domain being analyzed
 * @param {Object} userInfo - Additional info provided by user
 * @returns {Promise<Object>} Multi-page analysis with content for each page
 */
export const analyzeMultiplePages = async (screenshots, domain, userInfo = {}) => {
  if (!screenshots || screenshots.length === 0) {
    console.log('⚠️ No screenshots to analyze for multi-page');
    return null;
  }

  console.log(`🔍 Qwen3-VL: Analyzing ${screenshots.length} pages for ${domain}`);

  const pageAnalyses = [];

  for (const screenshotData of screenshots) {
    const { page, screenshot, url } = screenshotData;
    const base64Image = cleanBase64(screenshot);

    try {
      console.log(`📄 Analyzing page: ${page} (${url})`);

      const response = await axios.post(QWEN_VL_URL, {
        model: QWEN_MODEL,
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en analyse de sites web. Tu extrais le contenu et la structure des pages web pour les recréer. Réponds UNIQUEMENT en JSON valide.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              },
              {
                type: 'text',
                text: `Analyse cette page "${page}" du site ${domain} et extrait son contenu.

Retourne un JSON avec cette structure:
{
  "pageType": "home | services | about | contact | shop | gallery | menu | events | courses",
  "pageTitle": "Titre de la page",
  "sections": [
    {
      "type": "hero | features | services | products | gallery | testimonials | pricing | faq | about | contact | cta",
      "title": "Titre de la section",
      "subtitle": "Sous-titre si present",
      "content": "Contenu textuel",
      "items": [
        {
          "title": "Titre item",
          "description": "Description",
          "price": "Prix si applicable",
          "image": "Description de l'image"
        }
      ]
    }
  ],
  "navigation": ["Accueil", "Services", "Contact"],
  "cta": {
    "text": "Texte du bouton principal",
    "url": "URL cible"
  }
}`
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      }, {
        timeout: 90000
      });

      const content = response.data.choices[0].message.content;
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const pageAnalysis = JSON.parse(jsonMatch[0]);
          pageAnalyses.push({
            page,
            url,
            analysis: pageAnalysis
          });
          console.log(`✅ Page ${page} analyzed: ${pageAnalysis.sections?.length || 0} sections`);
        }
      } catch (parseError) {
        console.warn(`⚠️ Could not parse JSON for page ${page}`);
        pageAnalyses.push({
          page,
          url,
          analysis: { rawContent: content }
        });
      }

    } catch (error) {
      console.error(`❌ Error analyzing page ${page}:`, error.message);
      pageAnalyses.push({
        page,
        url,
        error: error.message
      });
    }
  }

  // Merge all page analyses into a comprehensive site structure
  const mergedContent = {
    domain,
    pages: pageAnalyses,
    navigation: pageAnalyses[0]?.analysis?.navigation || [],
    totalPages: pageAnalyses.length,
    analyzedAt: new Date().toISOString()
  };

  console.log(`✅ Qwen3-VL: Multi-page analysis complete - ${pageAnalyses.length} pages`);
  
  return mergedContent;
};

/**
 * Generate page-specific content for Claude
 * @param {Object} multiPageAnalysis - Analysis from analyzeMultiplePages
 * @param {string} pageType - Type of page to generate (home, services, about, etc.)
 * @returns {Object} Page-specific content structure
 */
export const generatePageContent = (multiPageAnalysis, pageType) => {
  if (!multiPageAnalysis?.pages) return null;

  const pageData = multiPageAnalysis.pages.find(p => 
    p.page === pageType || p.analysis?.pageType === pageType
  );

  if (!pageData?.analysis) return null;

  return {
    pageType,
    ...pageData.analysis
  };
};

export default {
  analyzeWebsiteWithQwen,
  generateClaudePrompt,
  extractTextFromImage,
  checkQwenHealth,
  analyzeAndGeneratePrompt,
  analyzeMultiplePages,
  generatePageContent
};
