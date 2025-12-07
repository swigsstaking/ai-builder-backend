import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude Sonnet 4.5 - Latest model (December 2025)
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

/**
 * Analyze website screenshots using Claude Vision
 * @param {Array<{page: string, screenshot: Buffer}>} screenshots
 * @returns {Promise<Object>} Analysis results
 */
export const analyzeWebsiteWithVision = async (screenshots, domain) => {
  if (!screenshots || screenshots.length === 0) {
    return null;
  }

  console.log(`🔍 Analyzing ${screenshots.length} screenshots with Claude Vision...`);

  // Prepare images for Claude Vision API
  const imageContents = screenshots.map((s, index) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/jpeg',
      data: s.screenshot.toString('base64'),
    },
  }));

  // Add text prompt after images
  const content = [
    ...imageContents,
    {
      type: 'text',
      text: `Analyse ces ${screenshots.length} captures d'écran du site web ${domain}.

Fournis une analyse détaillée en JSON avec:
{
  "siteName": "Nom détecté du site",
  "businessType": "Type d'entreprise détecté",
  "currentDesign": {
    "style": "Description du style actuel (moderne, classique, minimaliste, etc.)",
    "colors": {
      "primary": "#hex de la couleur principale",
      "secondary": "#hex de la couleur secondaire",
      "accent": "#hex de la couleur d'accent",
      "background": "#hex du fond"
    },
    "typography": "Description des polices utilisées",
    "layout": "Description de la mise en page"
  },
  "strengths": ["Points forts du design actuel"],
  "weaknesses": ["Points faibles à améliorer"],
  "contentSummary": {
    "mainMessage": "Message principal du site",
    "services": ["Services/produits détectés"],
    "targetAudience": "Public cible apparent"
  },
  "navigation": ["Pages détectées dans la navigation"],
  "contactInfo": {
    "phone": "Numéro si visible",
    "email": "Email si visible",
    "address": "Adresse si visible"
  },
  "recommendations": ["Recommandations d'amélioration"]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`,
    },
  ];

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(`✅ Vision analysis complete for ${domain}`);
      return analysis;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Claude Vision Error:', error.message);
    return null;
  }
};

/**
 * Generate website content using Claude AI
 */
export const generateWebsiteContent = async (projectData) => {
  const { domain, type, businessType, description, style, improvements, email, existingSiteData, visionAnalysis, deepseekAnalysis } = projectData;

  const isModernization = type === 'modernization';

  const systemPrompt = `Tu es un expert UX/UI et développeur web senior spécialisé dans la création de sites web professionnels suisses de haute qualité.

RÈGLES DE DESIGN CRITIQUES:
1. CONTRASTE OBLIGATOIRE (WCAG AA - ratio minimum 4.5:1):
   - Sur fond CLAIR (blanc, beige, gris clair): texte FONCÉ (#1a1a1a à #374151)
   - Sur fond FONCÉ (noir, bleu nuit, gris foncé): texte CLAIR (#ffffff à #e5e7eb)
   - JAMAIS de texte gris moyen (#666, #888, #999) sur fond gris
   - Les boutons doivent avoir un contraste fort avec leur texte

2. COULEURS - PALETTE COHÉRENTE:
   - Primary: couleur vive et distinctive pour boutons/liens (bleu #2563eb, vert #059669, orange #ea580c, violet #7c3aed)
   - Secondary: couleur CONTRASTANTE pour textes (foncée #1e293b si fond clair, claire #f8fafc si fond foncé)
   - Accent: couleur complémentaire vive pour CTAs et highlights
   - INTERDIT: gris moyen pour texte principal, couleurs trop proches entre texte et fond

3. STRUCTURE DU CONTENU:
   - Hero: titre impactant + sous-titre clair + CTA visible
   - Sections variées: alterner les types (features, about, services, testimonials, cta)
   - Contenu unique et spécifique au type d'entreprise
   - Textes concis mais informatifs (pas de lorem ipsum)

4. PERSONNALISATION:
   - Adapter le vocabulaire au secteur d'activité
   - Inclure des détails spécifiques au métier
   - Créer une identité visuelle cohérente
   - Proposer des services/offres réalistes

5. SEO:
   - Titre optimisé avec mots-clés locaux (ville, région)
   - Meta description engageante (150-160 caractères)
   - Mots-clés pertinents pour le secteur

LANGUE: Français suisse (vouvoiement, formulations professionnelles)`;

  // Build context from vision analysis for modernization
  let existingSiteContext = '';
  if (isModernization && visionAnalysis) {
    existingSiteContext = `

ANALYSE VISUELLE DU SITE EXISTANT (par IA Vision):
- Nom du site: ${visionAnalysis.siteName || 'Non détecté'}
- Type d'entreprise: ${visionAnalysis.businessType || 'Non détecté'}
- Style actuel: ${visionAnalysis.currentDesign?.style || 'Non analysé'}
- Couleurs actuelles: ${JSON.stringify(visionAnalysis.currentDesign?.colors) || 'Non détectées'}
- Typographie: ${visionAnalysis.currentDesign?.typography || 'Non analysée'}
- Layout: ${visionAnalysis.currentDesign?.layout || 'Non analysé'}

POINTS FORTS À CONSERVER:
${visionAnalysis.strengths?.map(s => `- ${s}`).join('\n') || '- Aucun identifié'}

POINTS FAIBLES À AMÉLIORER:
${visionAnalysis.weaknesses?.map(w => `- ${w}`).join('\n') || '- Aucun identifié'}

CONTENU DÉTECTÉ:
- Message principal: ${visionAnalysis.contentSummary?.mainMessage || 'Non détecté'}
- Services: ${visionAnalysis.contentSummary?.services?.join(', ') || 'Non détectés'}
- Public cible: ${visionAnalysis.contentSummary?.targetAudience || 'Non détecté'}

INFORMATIONS DE CONTACT:
- Téléphone: ${visionAnalysis.contactInfo?.phone || 'Non trouvé'}
- Email: ${visionAnalysis.contactInfo?.email || 'Non trouvé'}
- Adresse: ${visionAnalysis.contactInfo?.address || 'Non trouvée'}

RECOMMANDATIONS D'AMÉLIORATION:
${visionAnalysis.recommendations?.map(r => `- ${r}`).join('\n') || '- Aucune'}

IMPORTANT: 
- Conserve les informations de contact
- Améliore les points faibles identifiés
- Garde les points forts du design actuel
- Modernise selon les recommandations`;
  }
  
  // Add Qwen3-VL or DeepSeek-OCR analysis
  let aiAnalysisContext = '';
  
  // Check if we have Qwen3-VL full analysis (preferred)
  // deepseekAnalysis can be either the full qwenAnalysis object or just the analysis part
  const analysis = deepseekAnalysis?.extractedInfo ? deepseekAnalysis : deepseekAnalysis?.analysis;
  
  console.log('📊 Claude: Received analysis:', {
    hasExtractedInfo: !!analysis?.extractedInfo,
    businessName: analysis?.extractedInfo?.businessName,
    hasCreativeBrief: !!analysis?.creativeBrief,
    colors: analysis?.creativeBrief?.colors
  });
  
  if (analysis?.extractedInfo) {
    
    aiAnalysisContext = `

═══════════════════════════════════════════════════════════════
ANALYSE COMPLÈTE DU SITE (Qwen3-VL)
═══════════════════════════════════════════════════════════════

INFORMATIONS EXTRAITES:
- Nom de l'entreprise: ${analysis.extractedInfo?.businessName || 'Non détecté'}
- Type d'activité: ${analysis.extractedInfo?.businessType || 'Non détecté'}
- Slogan actuel: ${analysis.extractedInfo?.tagline || 'Non détecté'}
- Description: ${analysis.extractedInfo?.description || 'Non détectée'}
- Services: ${analysis.extractedInfo?.services?.join(', ') || 'Non détectés'}
- Contact: ${JSON.stringify(analysis.extractedInfo?.contactInfo || {})}
- Horaires: ${analysis.extractedInfo?.openingHours || 'Non détectés'}
- Style visuel actuel: ${analysis.extractedInfo?.visualStyle || 'Non analysé'}

BRIEF CRÉATIF SUGGÉRÉ:
- Objectif: ${analysis.creativeBrief?.objective || 'Modernisation'}
- Public cible: ${analysis.creativeBrief?.targetAudience || 'Non défini'}
- Ton de communication: ${analysis.creativeBrief?.brandVoice || 'Professionnel'}
- Couleurs suggérées: ${JSON.stringify(analysis.creativeBrief?.colors || {})}
- Sections recommandées: ${analysis.creativeBrief?.suggestedSections?.join(', ') || 'Standard'}
- Points forts: ${analysis.creativeBrief?.uniqueSellingPoints?.join(', ') || 'Non identifiés'}

SEO SUGGÉRÉ:
- Titre: ${analysis.seo?.title || 'À créer'}
- Description: ${analysis.seo?.description || 'À créer'}
- Mots-clés: ${analysis.seo?.keywords?.join(', ') || 'À définir'}

TAGLINE SUGGÉRÉE: ${analysis.suggestedTagline || 'À créer'}

═══════════════════════════════════════════════════════════════

INSTRUCTIONS CRITIQUES:
1. UTILISE les informations extraites pour créer un site PERSONNALISÉ
2. CONSERVE les informations de contact telles quelles
3. APPLIQUE les couleurs et le style suggérés par l'analyse
4. INTÈGRE les sections recommandées
5. AMÉLIORE la présentation tout en gardant l'identité de l'entreprise`;
    
    existingSiteContext += aiAnalysisContext;
  }
  // Fallback to simple text extraction (DeepSeek-OCR)
  else if (deepseekAnalysis && deepseekAnalysis.extractedText) {
    const extractedText = deepseekAnalysis.extractedText.substring(0, 4000);
    
    aiAnalysisContext = `

═══════════════════════════════════════════════════════════════
TEXTE EXTRAIT DU SITE EXISTANT (OCR - ${deepseekAnalysis.pageCount || 1} pages analysées)
═══════════════════════════════════════════════════════════════

${extractedText}

═══════════════════════════════════════════════════════════════

INSTRUCTIONS CRITIQUES:
1. Analyse ce texte pour identifier: nom de l'entreprise, type d'activité, services, coordonnées
2. CONSERVE les informations de contact (téléphone, email, adresse) telles quelles
3. RÉUTILISE le contenu pertinent (descriptions, services, horaires)
4. AMÉLIORE la présentation et le design, pas le contenu factuel
5. Crée un site UNIQUE basé sur ces informations RÉELLES`;
    
    existingSiteContext += aiAnalysisContext;
  } else if (deepseekAnalysis?.error) {
    console.warn('⚠️ AI Analysis failed:', deepseekAnalysis.error);
  }
  
  if (isModernization && existingSiteData && !visionAnalysis) {
    // Fallback to text scraping if no vision analysis
    existingSiteContext = `

DONNÉES DU SITE EXISTANT (scraping texte):
- Titre actuel: ${existingSiteData.title || 'Non trouvé'}
- Description actuelle: ${existingSiteData.metaDescription || 'Non trouvée'}
- Type d'entreprise détecté: ${existingSiteData.detectedBusinessType || 'Non détecté'}
- Navigation actuelle: ${existingSiteData.navigation?.map(n => n.text).join(', ') || 'Non trouvée'}
- Téléphones: ${existingSiteData.contactInfo?.phones?.join(', ') || 'Non trouvés'}
- Emails: ${existingSiteData.contactInfo?.emails?.join(', ') || 'Non trouvés'}

IMPORTANT: Conserve les informations de contact et adapte le contenu existant avec un design moderne.`;
  }

  // Simplified prompt for PREVIEW ONLY (homepage only)
  const userPrompt = `${isModernization ? `Modernise ce site existant:
- Domaine: ${domain}
- Améliorations: ${improvements}
${existingSiteContext}` : `Crée un site pour:
- Domaine: ${domain}
- Type: ${businessType}
- Description: ${description || 'Entreprise suisse'}`}

Génère un JSON pour l'APERÇU (page d'accueil uniquement):
{
  "siteName": "Nom extrait ou basé sur le domaine",
  "tagline": "Slogan accrocheur et UNIQUE",
  "description": "Description SEO (150 car.)",
  "designStyle": "artistic|bold|elegant|minimal|modern (choisis selon le type d'activité)",
  "colors": {
    "primary": "#hex (couleur vive adaptée à l'activité)",
    "secondary": "#1e293b",
    "accent": "#hex (couleur complémentaire)"
  },
  "hero": {
    "title": "Titre impactant basé sur l'activité",
    "subtitle": "Proposition de valeur unique",
    "cta": "Bouton d'action"
  },
  "features": [
    { "icon": "shield|zap|star|palette|camera|brush|globe|layers", "title": "Avantage 1", "description": "Détail" },
    { "icon": "...", "title": "Avantage 2", "description": "Détail" },
    { "icon": "...", "title": "Avantage 3", "description": "Détail" }
  ],
  "services": [
    { "title": "Service 1", "description": "Description détaillée" },
    { "title": "Service 2", "description": "Description détaillée" },
    { "title": "Service 3", "description": "Description détaillée" }
  ],
  "about": {
    "title": "À propos",
    "content": "Présentation de l'entreprise (2-3 phrases)",
    "stats": [
      { "value": "10+", "label": "Années" },
      { "value": "500+", "label": "Clients" }
    ]
  },
  "testimonial": {
    "quote": "Témoignage client réaliste",
    "author": "Prénom N.",
    "role": "Client satisfait"
  },
  "contact": {
    "phone": "Téléphone extrait ou ${email}",
    "email": "${email}",
    "address": "Adresse si disponible"
  }
}

RÈGLES DESIGN STYLE:
- "artistic" = studios créatifs, artistes, photographes, designers (layout asymétrique, couleurs vibrantes)
- "bold" = startups tech, agences marketing, entreprises innovantes (texte XXL, contrastes forts)
- "elegant" = luxe, hôtellerie, restaurants gastronomiques, bijouteries (raffiné, épuré)
- "minimal" = consultants, avocats, médecins, services professionnels (sobre, fonctionnel)
- "modern" = PME, commerces, services généraux (équilibré, polyvalent)

RÈGLES CONTENU:
1. Contenu 100% personnalisé basé sur l'analyse
2. Textes en français, professionnels
3. Utilise les vraies infos extraites (nom, services, contact)
4. Couleur primary vive et adaptée au secteur d'activité
5. Choisis le designStyle le plus adapté au type d'entreprise`;

  try {
    console.log('📝 Claude: Sending prompt to generate website content...');
    console.log('📝 Claude: Prompt length:', userPrompt.length, 'chars');
    console.log('📝 Claude: Prompt preview (first 1000 chars):', userPrompt.substring(0, 1000));
    
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract JSON from response
    const responseText = message.content[0].text;
    console.log('📝 Claude: Response length:', responseText.length, 'chars');
    console.log('📝 Claude: Stop reason:', message.stop_reason);
    console.log('📝 Claude: Raw response preview:', responseText.substring(0, 500));
    
    // Check if response was truncated
    if (message.stop_reason === 'max_tokens') {
      console.warn('⚠️ Claude: Response was truncated due to max_tokens limit');
    }
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Log what we got from Claude
      console.log('✅ Claude: Parsed JSON structure:', {
        siteName: parsed.siteName,
        tagline: parsed.tagline?.substring(0, 50),
        designStyle: parsed.designStyle || 'modern (default)',
        hasHero: !!parsed.hero,
        featuresCount: parsed.features?.length || 0,
        servicesCount: parsed.services?.length || 0,
        hasAbout: !!parsed.about,
        hasContact: !!parsed.contact,
        colors: parsed.colors
      });
      return parsed;
    }
    
    throw new Error('No valid JSON in response');
  } catch (error) {
    console.error('Claude API Error:', error.message);
    // Log the raw response for debugging
    if (error.message.includes('JSON')) {
      console.error('Claude: JSON parsing failed - response may be truncated');
    }
    throw error;
  }
};

/**
 * Regenerate content based on feedback
 */
export const regenerateWithFeedback = async (currentContent, feedback) => {
  const systemPrompt = `Tu es un expert en création de sites web. Tu modifies du contenu existant selon les retours du client.`;

  const userPrompt = `Contenu actuel du site:
${JSON.stringify(currentContent, null, 2)}

Modifications demandées par le client:
${feedback}

Génère le JSON mis à jour avec les modifications demandées. Garde la même structure.`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('No valid JSON in response');
  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
};

export default {
  generateWebsiteContent,
  regenerateWithFeedback,
};
