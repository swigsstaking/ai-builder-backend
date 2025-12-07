import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Récupérer tous les utilisateurs (filtré selon le rôle)
 * - Superadmin : voit tous les utilisateurs
 * - Admin : voit les utilisateurs qu'il a créés + ceux qui ont accès à ses sites
 * - Editor : ne peut pas accéder à cette route
 */
export const getUsers = async (req, res, next) => {
  try {
    let query = {};
    const { siteId } = req.query; // Optionnel : filtrer par site
    
    if (req.user.role === 'superadmin') {
      // Superadmin voit tout
      if (siteId) {
        // Chercher les users qui ont ce site dans leur liste de sites OU managedSites
        query.$or = [
          { sites: siteId },
          { managedSites: siteId },
          { role: 'superadmin' } // Les superadmins ont accès à tous les sites
        ];
      }
    } else if (req.user.role === 'admin') {
      // Admin voit seulement les users qu'il a créés ou qui ont accès à ses sites
      const adminSites = req.user.managedSites || [];
      query.$or = [
        { createdBy: req.user._id },
        { sites: { $in: adminSites } }
      ];
      if (siteId) {
        // Vérifier que le site appartient à cet admin
        if (!adminSites.some(s => s.toString() === siteId)) {
          return res.status(403).json({
            success: false,
            message: 'Accès non autorisé à ce site',
          });
        }
        // Filtrer par ce site spécifique
        query.$or = [
          { sites: siteId },
          { managedSites: siteId }
        ];
      }
    } else {
      // Editeur ne peut pas voir les autres utilisateurs
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }
    
    const users = await User.find(query)
      .select('-password')
      .populate('sites', 'name slug domain')
      .populate('managedSites', 'name slug domain')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer un utilisateur par ID
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('sites', 'name slug domain');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouvel utilisateur
 * - Superadmin : peut créer admin ou editor
 * - Admin : peut créer seulement des editors pour ses sites
 */
export const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, sites, managedSites } = req.body;
    
    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé',
      });
    }
    
    // Vérifier les permissions de création
    let allowedRole = 'editor';
    let allowedSites = sites || [];
    let allowedManagedSites = [];
    
    if (req.user.role === 'superadmin') {
      // Superadmin peut créer n'importe quel rôle
      allowedRole = role || 'editor';
      if (role === 'admin') {
        allowedManagedSites = managedSites || [];
      }
    } else if (req.user.role === 'admin') {
      // Admin peut seulement créer des editors pour ses propres sites
      if (role && role !== 'editor') {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez créer que des éditeurs',
        });
      }
      // Vérifier que les sites demandés appartiennent à cet admin
      const adminSites = req.user.managedSites?.map(s => s.toString()) || [];
      for (const siteId of allowedSites) {
        if (!adminSites.includes(siteId.toString())) {
          return res.status(403).json({
            success: false,
            message: 'Vous ne pouvez pas assigner un utilisateur à ce site',
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }
    
    // Créer l'utilisateur
    const user = await User.create({
      email,
      password,
      name,
      role: allowedRole,
      sites: allowedSites,
      managedSites: allowedManagedSites,
      createdBy: req.user._id,
    });
    
    // Retourner sans le mot de passe
    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('sites', 'name slug domain')
      .populate('managedSites', 'name slug domain');
    
    logger.success(`Utilisateur créé: ${email} (${allowedRole}) par ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mettre à jour un utilisateur
 * - Superadmin : peut tout modifier
 * - Admin : peut modifier les editors qu'il a créés
 */
export const updateUser = async (req, res, next) => {
  try {
    const { email, name, role, sites, managedSites, isActive } = req.body;
    
    const user = await User.findById(req.params.id).populate('createdBy', '_id');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }
    
    // Vérifier les permissions
    if (req.user.role === 'admin') {
      // Admin peut seulement modifier les users qu'il a créés
      if (!user.createdBy || user.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez pas modifier cet utilisateur',
        });
      }
      // Admin ne peut pas changer le rôle en autre chose qu'editor
      if (role && role !== 'editor') {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez pas changer le rôle',
        });
      }
    } else if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }
    
    // Mettre à jour les champs
    if (email) user.email = email;
    if (name) user.name = name;
    
    // Seul superadmin peut changer le rôle
    if (role && req.user.role === 'superadmin') {
      user.role = role;
    }
    
    // Mise à jour des sites
    if (sites !== undefined) {
      if (req.user.role === 'admin') {
        // Vérifier que les sites appartiennent à cet admin
        const adminSites = req.user.managedSites?.map(s => s.toString()) || [];
        for (const siteId of sites) {
          if (!adminSites.includes(siteId.toString())) {
            return res.status(403).json({
              success: false,
              message: 'Vous ne pouvez pas assigner ce site',
            });
          }
        }
      }
      user.sites = sites;
    }
    
    // Seul superadmin peut modifier managedSites
    if (managedSites !== undefined && req.user.role === 'superadmin') {
      user.managedSites = managedSites;
    }
    
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();
    
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('sites', 'name slug domain')
      .populate('managedSites', 'name slug domain');
    
    logger.success(`Utilisateur mis à jour: ${user.email} par ${req.user.email}`);
    
    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Changer le mot de passe d'un utilisateur
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }
    
    // Si c'est son propre mot de passe, vérifier l'ancien
    if (userId.toString() === req.user._id.toString()) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe actuel incorrect',
        });
      }
    }
    // Sinon, seul un admin peut changer le mot de passe sans l'ancien
    else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé',
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    logger.success(`Mot de passe changé pour: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Mot de passe mis à jour',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un utilisateur
 * - Superadmin : peut supprimer tout le monde sauf lui-même
 * - Admin : peut supprimer seulement les editors qu'il a créés
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('createdBy', '_id');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }
    
    // Empêcher la suppression de son propre compte
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte',
      });
    }
    
    // Vérifier les permissions
    if (req.user.role === 'admin') {
      // Admin peut seulement supprimer les users qu'il a créés
      if (!user.createdBy || user.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez pas supprimer cet utilisateur',
        });
      }
    } else if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }
    
    await user.deleteOne();
    
    logger.success(`Utilisateur supprimé: ${user.email} par ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Utilisateur supprimé',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assigner/Retirer des sites à un utilisateur (admin only)
 */
export const updateUserSites = async (req, res, next) => {
  try {
    const { sites } = req.body; // Array de site IDs
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }
    
    user.sites = sites;
    await user.save();
    
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('sites', 'name slug domain');
    
    logger.success(`Sites mis à jour pour: ${user.email}`);
    
    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
