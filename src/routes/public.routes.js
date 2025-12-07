import express from 'express';
import { getContent } from '../controllers/content.controller.js';
import Site from '../models/Site.js';
import Media from '../models/Media.js';
import Course from '../models/Course.js';
import Offer from '../models/Offer.js';

const router = express.Router();

// Routes publiques (sans authentification) pour les sites frontend

/**
 * GET /api/public/sites/:slug
 * Récupère les infos d'un site par son slug
 */
router.get('/sites/:slug', async (req, res, next) => {
  try {
    const site = await Site.findOne({ slug: req.params.slug });
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    // Convertir en objet pour pouvoir modifier
    const siteData = site.toObject();
    
    // S'assurer que googleOAuthConfig est inclus avec clientId (pas le secret)
    if (site.googleOAuthConfig?.enabled && site.googleOAuthConfig?.clientId) {
      siteData.googleOAuthConfig = {
        clientId: site.googleOAuthConfig.clientId,
        enabled: site.googleOAuthConfig.enabled,
      };
    }

    res.json({
      success: true,
      data: siteData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/content?siteId=xxx&type=menu
 * GET /api/public/content?siteId=xxx&section=events
 * Récupère le contenu public d'un site
 * siteId peut être un slug ou un ID MongoDB
 */
router.get('/content', async (req, res, next) => {
  try {
    const { siteId } = req.query;
    
    // Si siteId est fourni, vérifier si c'est un slug et le convertir en ID
    if (siteId) {
      // Essayer de trouver le site par slug
      const site = await Site.findOne({ slug: siteId });
      if (site) {
        // Remplacer le slug par l'ID MongoDB
        req.query.siteId = site._id.toString();
      }
      // Si pas trouvé par slug, on laisse tel quel (peut-être déjà un ID)
    }
    
    // Réutiliser le controller existant mais sans authentification
    req.user = null; // Pas d'utilisateur pour les routes publiques
    await getContent(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/courses?siteId=xxx&status=active
 * Récupère les cours publics d'un site
 * siteId peut être un slug ou un ID MongoDB
 */
router.get('/courses', async (req, res, next) => {
  try {
    let { siteId, status } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }

    // Si siteId est un slug, le convertir en ID
    const site = await Site.findOne({ slug: siteId });
    if (site) {
      siteId = site._id;
    }

    // Construire la query
    const query = { site: siteId };
    if (status) {
      query.status = status;
    }

    // Récupérer les cours
    const courses = await Course.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/media/stats?siteId=xxx
 * Récupère les statistiques médias d'un site (taille totale et nombre)
 * siteId peut être un slug ou un ID MongoDB
 */
router.get('/media/stats', async (req, res, next) => {
  try {
    let { siteId } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }

    // Si siteId est un slug, le convertir en ID
    const site = await Site.findOne({ slug: siteId });
    if (site) {
      siteId = site._id.toString();
    }

    // Récupérer les médias depuis MongoDB filtrés par site
    const media = await Media.find({ siteId });

    // Calculer le poids total
    const totalSize = media.reduce((sum, item) => sum + (item.size || 0), 0);

    res.json({
      success: true,
      count: media.length,
      totalSize, // en bytes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/offers?siteId=xxx&valid=true
 * Récupère les offres publiques d'un site
 * siteId peut être un slug ou un ID MongoDB
 * valid=true pour récupérer uniquement les offres valides (dans la période)
 */
router.get('/offers', async (req, res, next) => {
  try {
    let { siteId, valid } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }

    // Si siteId est un slug, le convertir en ID
    const site = await Site.findOne({ slug: siteId });
    if (site) {
      siteId = site._id;
    }

    // Construire la query
    const query = { site: siteId, status: 'active' };
    
    // Filtrer les offres valides (dans la période de validité)
    if (valid === 'true') {
      const now = new Date();
      query.validFrom = { $lte: now };
      query.validUntil = { $gte: now };
    }

    // Récupérer les offres
    const offers = await Offer.find(query).sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
