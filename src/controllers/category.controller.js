import Category from '../models/Category.js';
import logger from '../utils/logger.js';

// Récupérer toutes les catégories (avec filtres selon permissions)
export const getCategories = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId, parent } = req.query;
    
    let query = {};
    
    // Filtre selon rôle
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    // Filtre par parent (pour hiérarchie)
    if (parent !== undefined) {
      query.parent = parent === 'null' ? null : parent;
    }
    
    const categories = await Category.find(query)
      .populate('site', 'name slug')
      .populate('parent', 'name slug')
      .sort({ order: 1, name: 1 });
    
    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    logger.error('Error getting categories:', error);
    next(error);
  }
};

// Récupérer une catégorie par ID
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('site', 'name slug')
      .populate('parent', 'name slug');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée',
      });
    }
    
    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error('Error getting category:', error);
    next(error);
  }
};

// Créer une catégorie
export const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    
    logger.info(`Category created: ${category.name} (${category._id})`);
    
    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error('Error creating category:', error);
    next(error);
  }
};

// Mettre à jour une catégorie
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée',
      });
    }
    
    logger.info(`Category updated: ${category.name} (${category._id})`);
    
    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error('Error updating category:', error);
    next(error);
  }
};

// Supprimer une catégorie
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée',
      });
    }
    
    // Vérifier si la catégorie a des produits
    if (category.productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une catégorie contenant des produits',
      });
    }
    
    await category.deleteOne();
    
    logger.info(`Category deleted: ${category.name} (${category._id})`);
    
    res.json({
      success: true,
      message: 'Catégorie supprimée',
    });
  } catch (error) {
    logger.error('Error deleting category:', error);
    next(error);
  }
};

// ROUTES PUBLIQUES (pour frontend)

// Récupérer catégories publiques
export const getPublicCategories = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }
    
    const categories = await Category.find({
      site: siteId,
      isActive: true,
    })
      .populate('parent', 'name slug')
      .select('-productCount')
      .sort({ order: 1, name: 1 });
    
    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    logger.error('Error getting public categories:', error);
    next(error);
  }
};
