import PromoCode from '../models/PromoCode.js';
import logger from '../utils/logger.js';

// Créer un code promo
export const createPromoCode = async (req, res, next) => {
  try {
    const promoCode = await PromoCode.create(req.body);
    
    logger.info(`Code promo créé: ${promoCode.code}`);
    
    res.status(201).json({
      success: true,
      data: promoCode,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ce code promo existe déjà pour ce site',
      });
    }
    next(error);
  }
};

// Récupérer tous les codes promo
export const getPromoCodes = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId, isActive, type } = req.query;
    
    let query = {};
    
    // Filtre selon rôle
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    // Filtres optionnels
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (type) {
      query.type = type;
    }
    
    const promoCodes = await PromoCode.find(query)
      .populate('site', 'name slug')
      .populate('applicableProducts', 'name')
      .populate('applicableCategories', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: promoCodes.length,
      data: promoCodes,
    });
  } catch (error) {
    logger.error('Error getting promo codes:', error);
    next(error);
  }
};

// Récupérer un code promo par ID
export const getPromoCodeById = async (req, res, next) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id)
      .populate('site', 'name slug')
      .populate('applicableProducts', 'name price')
      .populate('applicableCategories', 'name');
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Code promo non trouvé',
      });
    }
    
    res.json({
      success: true,
      data: promoCode,
    });
  } catch (error) {
    logger.error('Error getting promo code:', error);
    next(error);
  }
};

// Mettre à jour un code promo
export const updatePromoCode = async (req, res, next) => {
  try {
    const promoCode = await PromoCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Code promo non trouvé',
      });
    }
    
    logger.info(`Code promo mis à jour: ${promoCode.code}`);
    
    res.json({
      success: true,
      data: promoCode,
    });
  } catch (error) {
    logger.error('Error updating promo code:', error);
    next(error);
  }
};

// Supprimer un code promo
export const deletePromoCode = async (req, res, next) => {
  try {
    const promoCode = await PromoCode.findByIdAndDelete(req.params.id);
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Code promo non trouvé',
      });
    }
    
    logger.info(`Code promo supprimé: ${promoCode.code}`);
    
    res.json({
      success: true,
      message: 'Code promo supprimé',
    });
  } catch (error) {
    logger.error('Error deleting promo code:', error);
    next(error);
  }
};

// Valider un code promo (PUBLIC - pour le checkout)
export const validatePromoCode = async (req, res, next) => {
  try {
    const { code, siteId, subtotal, items } = req.body;
    
    if (!code || !siteId) {
      return res.status(400).json({
        success: false,
        message: 'Code et siteId requis',
      });
    }
    
    // Chercher le code promo
    const promoCode = await PromoCode.findOne({
      code: code.toUpperCase(),
      site: siteId,
    });
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Code promo invalide',
      });
    }
    
    // Vérifier validité
    const validation = promoCode.isValid();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }
    
    // Calculer la réduction
    const discount = promoCode.calculateDiscount(subtotal, items);
    
    res.json({
      success: true,
      data: {
        code: promoCode.code,
        type: promoCode.type,
        value: promoCode.value,
        discount,
        description: promoCode.description,
      },
    });
  } catch (error) {
    logger.error('Error validating promo code:', error);
    next(error);
  }
};

// Incrémenter le compteur d'utilisation (appelé après paiement)
export const incrementPromoCodeUsage = async (code, siteId) => {
  try {
    await PromoCode.findOneAndUpdate(
      { code: code.toUpperCase(), site: siteId },
      { $inc: { usedCount: 1 } }
    );
    logger.info(`Code promo utilisé: ${code}`);
  } catch (error) {
    logger.error('Error incrementing promo code usage:', error);
  }
};
