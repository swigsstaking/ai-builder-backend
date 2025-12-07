import Offer from '../models/Offer.js';

// Créer une offre
export const createOffer = async (req, res, next) => {
  try {
    const offer = new Offer(req.body);
    await offer.save();
    
    res.status(201).json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// Récupérer toutes les offres (avec filtres)
export const getOffers = async (req, res, next) => {
  try {
    const { siteId, status, valid } = req.query;
    const user = req.user;
    
    let query = {};
    
    // Filtrer par site selon les permissions
    if (user.role === 'editor') {
      // Les éditeurs ne voient que les offres de leurs sites
      query.site = { $in: user.sites };
    } else if (siteId) {
      // Les admins peuvent filtrer par site
      query.site = siteId;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Filtrer les offres valides (dans la période de validité)
    if (valid === 'true') {
      const now = new Date();
      query.validFrom = { $lte: now };
      query.validUntil = { $gte: now };
      query.status = 'active';
    }
    
    const offers = await Offer.find(query)
      .populate('site', 'name slug')
      .sort({ order: 1, createdAt: -1 });
    
    res.json({
      success: true,
      count: offers.length,
      data: offers
    });
  } catch (error) {
    next(error);
  }
};

// Récupérer une offre par ID
export const getOfferById = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('site', 'name slug');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offre non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// Mettre à jour une offre
export const updateOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offre non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer une offre
export const deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offre non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Offre supprimée'
    });
  } catch (error) {
    next(error);
  }
};
