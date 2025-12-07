import logger from '../utils/logger.js';
import Course from '../models/Course.js';
import Offer from '../models/Offer.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';

/**
 * Middleware pour vérifier l'accès à un site spécifique
 * Les admins ont accès à tous les sites
 * Les editors n'ont accès qu'aux sites qui leur sont assignés
 */
export const checkSiteAccess = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Récupérer le siteId depuis les params, query ou body
    let siteId = req.params.siteId || req.query.siteId || req.body.siteId || req.body.site;
    
    // Si pas de siteId mais qu'on a un ID de ressource (cours, offre, produit, etc.)
    // On essaie de récupérer le siteId depuis la ressource
    if (!siteId && req.params.id) {
      const resourceId = req.params.id;
      
      // Déterminer le type de ressource selon la route
      if (req.baseUrl.includes('/courses')) {
        const course = await Course.findById(resourceId).select('site');
        if (course) {
          // Extraire l'ID si c'est un objet, sinon utiliser tel quel
          siteId = course.site._id || course.site;
        }
      } else if (req.baseUrl.includes('/offers')) {
        const offer = await Offer.findById(resourceId).select('site');
        if (offer) {
          // Extraire l'ID si c'est un objet, sinon utiliser tel quel
          siteId = offer.site._id || offer.site;
        }
      } else if (req.baseUrl.includes('/products')) {
        const product = await Product.findById(resourceId).select('site');
        if (product) {
          siteId = product.site._id || product.site;
        }
      } else if (req.baseUrl.includes('/categories')) {
        const category = await Category.findById(resourceId).select('site');
        if (category) {
          siteId = category.site._id || category.site;
        }
      } else if (req.baseUrl.includes('/orders')) {
        const order = await Order.findById(resourceId).select('site');
        if (order) {
          siteId = order.site._id || order.site;
        }
      }
    }
    
    if (!siteId) {
      // Si pas de siteId, laisser passer (routes globales)
      return next();
    }
    
    // Les admins et superadmins ont accès à tous les sites
    if (user.role === 'admin' || user.role === 'superadmin') {
      logger.debug(`Admin/Superadmin ${user.email} accède au site ${siteId}`);
      return next();
    }
    
    // Les editors doivent avoir le site dans leur liste
    if (user.role === 'editor') {
      // Convertir siteId en string pour la comparaison
      // Si c'est un objet avec _id, extraire l'_id, sinon convertir directement
      const siteIdString = (siteId._id || siteId).toString();
      
      logger.debug(`Editor ${user.email} - Sites assignés:`, user.sites);
      logger.debug(`Site demandé (objet):`, siteId);
      logger.debug(`Site demandé (string):`, siteIdString);
      
      const hasAccess = user.sites.some(site => site.toString() === siteIdString);
      
      if (hasAccess) {
        logger.debug(`✅ Editor ${user.email} accède au site ${siteIdString}`);
        return next();
      } else {
        logger.warn(`❌ Editor ${user.email} refusé pour le site ${siteIdString} - Sites autorisés:`, user.sites.map(s => s.toString()));
        return res.status(403).json({
          success: false,
          message: 'Vous n\'avez pas accès à ce site',
        });
      }
    }
    
    // Rôle inconnu
    return res.status(403).json({
      success: false,
      message: 'Rôle utilisateur invalide',
    });
    
  } catch (error) {
    logger.error('Erreur checkSiteAccess:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur de vérification des permissions',
    });
  }
};

/**
 * Middleware pour vérifier qu'un utilisateur est admin ou superadmin
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    logger.warn(`Non-admin ${req.user.email} (${req.user.role}) tente d'accéder à une route admin`);
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs',
    });
  }
  next();
};

/**
 * Middleware pour vérifier qu'un utilisateur peut modifier un autre utilisateur
 * - Les admins peuvent modifier tout le monde
 * - Les users ne peuvent modifier que leur propre profil
 */
export const canModifyUser = (req, res, next) => {
  const currentUser = req.user;
  const targetUserId = req.params.id || req.params.userId;
  
  // Admin et superadmin peuvent tout modifier
  if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
    return next();
  }
  
  // Un user peut modifier son propre profil
  if (targetUserId && targetUserId.toString() === currentUser._id.toString()) {
    return next();
  }
  
  logger.warn(`User ${currentUser.email} tente de modifier un autre utilisateur`);
  return res.status(403).json({
    success: false,
    message: 'Vous ne pouvez modifier que votre propre profil',
  });
};

/**
 * Middleware pour filtrer les sites selon les permissions
 * Ajoute req.allowedSites avec la liste des sites accessibles
 */
export const filterSitesByPermissions = (req, res, next) => {
  const user = req.user;
  
  if (user.role === 'admin' || user.role === 'superadmin') {
    // Admin/Superadmin voit tous les sites (pas de filtre)
    req.allowedSites = null; // null = tous
  } else if (user.role === 'editor') {
    // Editor voit uniquement ses sites
    req.allowedSites = user.sites;
  } else {
    // Autres rôles : aucun site
    req.allowedSites = [];
  }
  
  next();
};

export default {
  checkSiteAccess,
  requireAdmin,
  canModifyUser,
  filterSitesByPermissions,
};
