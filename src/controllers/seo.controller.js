import SEO from '../models/SEO.js';
import Site from '../models/Site.js';

// @desc    Get SEO for a site/page
// @route   GET /api/seo?siteId=xxx&page=xxx
// @access  Private
export const getSEO = async (req, res, next) => {
  try {
    const { siteId, page } = req.query;

    const query = {};
    if (siteId) query.site = siteId;
    if (page) query.page = page;

    const seo = await SEO.find(query).populate('site', 'name slug');

    res.json({
      success: true,
      count: seo.length,
      data: seo,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single SEO entry
// @route   GET /api/seo/:id
// @access  Private
export const getSEOById = async (req, res, next) => {
  try {
    const seo = await SEO.findById(req.params.id).populate('site');

    if (!seo) {
      return res.status(404).json({
        success: false,
        message: 'SEO entry not found',
      });
    }

    res.json({
      success: true,
      data: seo,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update SEO
// @route   POST /api/seo
// @access  Private
export const upsertSEO = async (req, res, next) => {
  try {
    const { site, page } = req.body;

    // Check if SEO entry exists
    let seo = await SEO.findOne({ site, page });

    if (seo) {
      // Update existing
      seo = await SEO.findByIdAndUpdate(seo._id, req.body, {
        new: true,
        runValidators: true,
      });
    } else {
      // Create new
      seo = await SEO.create(req.body);
    }

    res.status(seo.isNew ? 201 : 200).json({
      success: true,
      data: seo,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete SEO
// @route   DELETE /api/seo/:id
// @access  Private
export const deleteSEO = async (req, res, next) => {
  try {
    const seo = await SEO.findByIdAndDelete(req.params.id);

    if (!seo) {
      return res.status(404).json({
        success: false,
        message: 'SEO entry not found',
      });
    }

    res.json({
      success: true,
      message: 'SEO entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Synchronize SEO from frontend site
// @route   POST /api/seo/sync-from-site/:siteId
// @access  Private (Admin only)
export const syncFromSite = async (req, res, next) => {
  try {
    const { siteId } = req.params;

    // Récupérer le site
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé',
      });
    }

    // Lire le fichier seo.json directement depuis le serveur
    const path = await import('path');
    const fs = await import('fs/promises');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Déterminer le chemin selon le site
    let seoPath;
    if (site.slug === 'speed-l') {
      seoPath = path.join(__dirname, '../../../src/data/seo.json');
    } else {
      seoPath = path.join(__dirname, `../../../sites/${site.slug}/src/data/seo.json`);
    }

    // Lire le fichier
    let seoData;
    try {
      const fileContent = await fs.readFile(seoPath, 'utf-8');
      seoData = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Erreur lecture SEO pour ${site.name} (slug: ${site.slug}):`, error.message);
      console.error(`Chemin recherché: ${seoPath}`);
      return res.status(404).json({
        success: false,
        message: `Impossible de lire le fichier SEO pour ${site.name} (slug: ${site.slug}). Le site n'existe peut-être pas encore sur le serveur. Chemin: ${seoPath}`,
      });
    }

    // Vérifier que le fichier contient des pages
    if (!seoData.pages || Object.keys(seoData.pages).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le fichier seo.json ne contient aucune page',
      });
    }

    // Importer chaque page dans MongoDB
    const imported = [];
    const pages = Object.keys(seoData.pages);

    for (const page of pages) {
      const pageData = seoData.pages[page];

      // Upsert (créer ou mettre à jour)
      const seo = await SEO.findOneAndUpdate(
        { site: site._id, page },
        {
          site: site._id,
          page,
          title: pageData.title || '',
          description: pageData.description || '',
          keywords: pageData.keywords || [],
          ogTitle: pageData.ogTitle || pageData.title || '',
          ogDescription: pageData.ogDescription || pageData.description || '',
          ogImage: pageData.ogImage || null,
          robots: pageData.robots || 'index,follow',
          canonical: pageData.canonical || null,
        },
        { upsert: true, new: true, runValidators: true }
      );

      imported.push(seo);
    }

    // Mettre à jour la liste des pages dans le site
    const pagesList = pages.map(page => ({
      value: page,
      label: seoData.pages[page].title || page,
    }));

    await Site.findByIdAndUpdate(siteId, { pages: pagesList });

    res.json({
      success: true,
      message: `${imported.length} page(s) synchronisée(s) depuis ${site.domain}`,
      data: imported,
    });
  } catch (error) {
    next(error);
  }
};
