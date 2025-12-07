import * as cheerio from 'cheerio';

/**
 * Scrape website content for modernization
 * Extracts text, structure, colors, and images from existing site
 */
export const scrapeWebsite = async (url) => {
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    console.log(`🔍 Scraping website: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SWIGSBot/1.0; +https://swigs.online)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata
    const title = $('title').text().trim() || '';
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';

    // Extract main headings
    const headings = {
      h1: [],
      h2: [],
      h3: [],
    };
    $('h1').each((_, el) => headings.h1.push($(el).text().trim()));
    $('h2').each((_, el) => headings.h2.push($(el).text().trim()));
    $('h3').each((_, el) => headings.h3.push($(el).text().trim()));

    // Extract navigation links
    const navigation = [];
    $('nav a, header a, .nav a, .menu a').each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (text && href && !href.startsWith('#') && text.length < 50) {
        navigation.push({ text, href });
      }
    });

    // Extract main content paragraphs
    const paragraphs = [];
    $('main p, article p, .content p, section p').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && text.length < 500) {
        paragraphs.push(text);
      }
    });

    // Extract images
    const images = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || '';
      if (src && !src.includes('data:image')) {
        // Convert relative URLs to absolute
        const absoluteSrc = src.startsWith('http') 
          ? src 
          : new URL(src, fullUrl).href;
        images.push({ src: absoluteSrc, alt });
      }
    });

    // Extract colors from inline styles and CSS
    const colors = new Set();
    $('[style]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const colorMatches = style.match(/#[0-9A-Fa-f]{3,6}|rgb\([^)]+\)/g);
      if (colorMatches) {
        colorMatches.forEach(c => colors.add(c));
      }
    });

    // Extract contact info
    const contactInfo = {
      phones: [],
      emails: [],
      addresses: [],
    };

    // Find phone numbers
    const phoneRegex = /(\+41|0)[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g;
    const bodyText = $('body').text();
    const phones = bodyText.match(phoneRegex);
    if (phones) contactInfo.phones = [...new Set(phones)];

    // Find emails
    $('a[href^="mailto:"]').each((_, el) => {
      const email = $(el).attr('href').replace('mailto:', '');
      contactInfo.emails.push(email);
    });

    // Extract social links
    const socialLinks = [];
    $('a[href*="facebook"], a[href*="instagram"], a[href*="twitter"], a[href*="linkedin"], a[href*="youtube"]').each((_, el) => {
      socialLinks.push($(el).attr('href'));
    });

    // Detect business type from content
    const allText = bodyText.toLowerCase();
    let detectedBusinessType = 'entreprise';
    
    const businessKeywords = {
      'restaurant': ['menu', 'réservation', 'cuisine', 'plat', 'restaurant', 'gastronomie'],
      'auto-école': ['permis', 'conduite', 'leçon', 'examen', 'véhicule', 'auto-école'],
      'immobilier': ['appartement', 'maison', 'louer', 'vendre', 'immobilier', 'bien'],
      'médical': ['médecin', 'consultation', 'santé', 'patient', 'cabinet'],
      'juridique': ['avocat', 'juridique', 'droit', 'conseil', 'litige'],
      'commerce': ['produit', 'achat', 'panier', 'livraison', 'boutique'],
      'hôtel': ['chambre', 'réservation', 'séjour', 'hôtel', 'nuit'],
      'sport': ['cours', 'entraînement', 'fitness', 'sport', 'salle'],
    };

    for (const [type, keywords] of Object.entries(businessKeywords)) {
      const matches = keywords.filter(k => allText.includes(k)).length;
      if (matches >= 2) {
        detectedBusinessType = type;
        break;
      }
    }

    const result = {
      url: fullUrl,
      title,
      metaDescription,
      metaKeywords,
      headings,
      navigation: navigation.slice(0, 10), // Limit to 10
      paragraphs: paragraphs.slice(0, 10), // Limit to 10
      images: images.slice(0, 20), // Limit to 20
      colors: [...colors].slice(0, 10),
      contactInfo,
      socialLinks: [...new Set(socialLinks)],
      detectedBusinessType,
    };

    console.log(`✅ Scraped ${fullUrl}:`, {
      title: result.title,
      paragraphs: result.paragraphs.length,
      images: result.images.length,
      businessType: result.detectedBusinessType,
    });

    return result;
  } catch (error) {
    console.error(`❌ Scraping error for ${url}:`, error.message);
    return {
      url,
      error: error.message,
      title: '',
      metaDescription: '',
      headings: { h1: [], h2: [], h3: [] },
      navigation: [],
      paragraphs: [],
      images: [],
      colors: [],
      contactInfo: { phones: [], emails: [], addresses: [] },
      socialLinks: [],
      detectedBusinessType: 'entreprise',
    };
  }
};

export default { scrapeWebsite };
