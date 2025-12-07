import Site from '../models/Site.js';
import { invalidateCache } from '../middleware/cache.middleware.js';

// @desc    Get all sites
// @route   GET /api/sites
// @access  Private (filtré selon le rôle)
export const getSites = async (req, res, next) => {
  try {
    let query = { isActive: true };
    
    // Filtrer selon le rôle de l'utilisateur
    if (req.user) {
      if (req.user.role === 'superadmin') {
        // Superadmin voit tous les sites
        // Pas de filtre supplémentaire
      } else if (req.user.role === 'admin') {
        // Admin voit seulement ses sites (où il est owner ou dans managedSites)
        query.$or = [
          { owner: req.user._id },
          { _id: { $in: req.user.managedSites || [] } }
        ];
      } else if (req.user.role === 'editor') {
        // Editeur voit seulement les sites auxquels il a accès
        query._id = { $in: req.user.sites || [] };
      }
    }
    
    // Inclure TOUS les champs sensibles pour l'admin
    const sites = await Site.find(query)
      .select('+stripeConfig.secretKey +stripeConfig.webhookSecret +googleOAuthConfig.clientSecret')
      .populate('owner', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: sites.length,
      data: sites,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single site
// @route   GET /api/sites/:id
// @access  Private
export const getSite = async (req, res, next) => {
  try {
    // Inclure TOUS les champs sensibles pour l'admin
    const site = await Site.findById(req.params.id)
      .select('+stripeConfig.secretKey +stripeConfig.webhookSecret +googleOAuthConfig.clientSecret');

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    // Retourner le site avec tous les champs (y compris secrets)
    res.json({
      success: true,
      data: site,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create site
// @route   POST /api/sites
// @access  Private (Admin only)
export const createSite = async (req, res, next) => {
  try {
    const site = await Site.create(req.body);

    // Invalider le cache
    await invalidateCache('sites:*');
    await invalidateCache('site:*');

    res.status(201).json({
      success: true,
      data: site,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update site
// @route   PUT /api/sites/:id
// @access  Private (Admin only)
export const updateSite = async (req, res, next) => {
  try {
    // Try to find by ID first, then by slug
    let site = await Site.findById(req.params.id).catch(() => null);
    
    if (!site) {
      // If not found by ID, try by slug
      site = await Site.findOne({ slug: req.params.id });
    }

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    // Clean URLs before updating
    if (req.body.domain) {
      req.body.domain = req.body.domain.replace(/^https?:\/\//, '');
    }
    
    if (req.body.domains && Array.isArray(req.body.domains)) {
      req.body.domains = req.body.domains.map(d => ({
        ...d,
        url: d.url ? d.url.replace(/^https?:\/\//, '') : d.url
      }));
    }

    // SYNCHRONISATION: Si domains est envoyé, mettre à jour domain aussi
    if (req.body.domains && req.body.domains.length > 0) {
      const primaryDomain = req.body.domains.find(d => d.isPrimary) || req.body.domains[0];
      req.body.domain = primaryDomain.url;
    }
    
    // SYNCHRONISATION: Si domain est envoyé, mettre à jour domains[0] aussi
    if (req.body.domain && !req.body.domains) {
      const cleanDomain = req.body.domain.replace(/^https?:\/\//, '');
      if (site.domains && site.domains.length > 0) {
        // Mettre à jour le domaine principal existant
        site.domains[0].url = cleanDomain;
        site.markModified('domains');
      } else {
        // Créer un nouveau domaine principal
        site.domains = [{
          url: cleanDomain,
          environment: 'production',
          isPrimary: true
        }];
      }
      req.body.domain = cleanDomain;
    }

    // Gérer le cas où owner est null ou vide (pour retirer le propriétaire)
    if (req.body.owner === null || req.body.owner === '' || req.body.owner === undefined) {
      delete req.body.owner;
      site.owner = null;
    }

    // Update the site
    Object.assign(site, req.body);
    
    // Marquer domains comme modifié pour Mongoose
    if (req.body.domains) {
      site.markModified('domains');
    }
    
    // Marquer les champs avec select: false comme modifiés
    if (req.body.stripeConfig) {
      site.markModified('stripeConfig');
    }
    
    if (req.body.googleOAuthConfig) {
      site.markModified('googleOAuthConfig');
    }
    
    // Marquer settings comme modifié pour les objets imbriqués
    if (req.body.settings) {
      site.markModified('settings');
    }
    
    await site.save();

    // Invalider le cache
    console.log('🗑️  Invalidation cache après modification site...');
    const deletedSites = await invalidateCache('sites:*');
    const deletedSite = await invalidateCache('site:*');
    console.log(`✅ Cache invalidé: ${deletedSites} clés sites, ${deletedSite} clés site`);

    res.json({
      success: true,
      data: site,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete site
// @route   DELETE /api/sites/:id
// @access  Private (Admin only)
export const deleteSite = async (req, res, next) => {
  try {
    // Accepter soit un ID MongoDB, soit un slug
    let site;
    try {
      site = await Site.findById(req.params.id);
    } catch (e) {
      // Si ce n'est pas un ObjectId valide, chercher par slug
      site = await Site.findOne({ slug: req.params.id });
    }

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    // Hard delete (suppression définitive)
    await Site.findByIdAndDelete(site._id);

    // Invalider le cache
    await invalidateCache('sites:*');
    await invalidateCache('site:*');

    res.json({
      success: true,
      message: `Site "${site.slug}" supprimé définitivement`,
    });
  } catch (error) {
    next(error);
  }
};
