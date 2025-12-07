import Product from '../models/Product.js';
import Category from '../models/Category.js';
import logger from '../utils/logger.js';

// Récupérer tous les produits (avec filtres selon permissions)
export const getProducts = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId, category, featured, search, isActive } = req.query;
    
    let query = {};
    
    // Filtre selon rôle (même pattern que offers.controller.js)
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    // Filtres additionnels
    if (category) query.category = category;
    if (featured !== undefined) query.isFeatured = featured === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    
    const products = await Product.find(query)
      .populate('site', 'name slug')
      .populate('category', 'name slug')
      .sort({ order: 1, createdAt: -1 });
    
    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    logger.error('Error getting products:', error);
    next(error);
  }
};

// Récupérer un produit par ID
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('site', 'name slug')
      .populate('category', 'name slug');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé',
      });
    }
    
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('Error getting product:', error);
    next(error);
  }
};

// Créer un produit
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    
    // Incrémenter le compteur de produits de la catégorie
    if (product.category) {
      await Category.findByIdAndUpdate(product.category, {
        $inc: { productCount: 1 },
      });
    }
    
    logger.info(`Product created: ${product.name} (${product._id})`);
    
    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('Error creating product:', error);
    next(error);
  }
};

// Mettre à jour un produit
export const updateProduct = async (req, res, next) => {
  try {
    const oldProduct = await Product.findById(req.params.id);
    
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé',
      });
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // Mettre à jour les compteurs de catégories si changement
    if (oldProduct.category?.toString() !== product.category?.toString()) {
      if (oldProduct.category) {
        await Category.findByIdAndUpdate(oldProduct.category, {
          $inc: { productCount: -1 },
        });
      }
      if (product.category) {
        await Category.findByIdAndUpdate(product.category, {
          $inc: { productCount: 1 },
        });
      }
    }
    
    logger.info(`Product updated: ${product.name} (${product._id})`);
    
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('Error updating product:', error);
    next(error);
  }
};

// Supprimer un produit
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé',
      });
    }
    
    // Décrémenter le compteur de la catégorie
    if (product.category) {
      await Category.findByIdAndUpdate(product.category, {
        $inc: { productCount: -1 },
      });
    }
    
    logger.info(`Product deleted: ${product.name} (${product._id})`);
    
    res.json({
      success: true,
      message: 'Produit supprimé',
    });
  } catch (error) {
    logger.error('Error deleting product:', error);
    next(error);
  }
};

// Réordonner les produits
export const reorderProducts = async (req, res, next) => {
  try {
    const { products } = req.body;
    
    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        message: 'Products must be an array',
      });
    }
    
    // Mettre à jour l'ordre de chaque produit
    const updatePromises = products.map((product, index) =>
      Product.findByIdAndUpdate(product._id || product.id, { order: index })
    );
    
    await Promise.all(updatePromises);
    
    logger.info(`Products reordered: ${products.length} products`);
    
    res.json({
      success: true,
      message: 'Produits réordonnés',
    });
  } catch (error) {
    logger.error('Error reordering products:', error);
    next(error);
  }
};

// ROUTES PUBLIQUES (pour frontend)

// Récupérer produits publics
export const getPublicProducts = async (req, res, next) => {
  try {
    const { siteId, category, featured, search } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }
    
    let query = {
      site: siteId,
      isActive: true,
    };
    
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
      ];
    }
    
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .select('-views -sales')
      .sort({ order: 1, createdAt: -1 });
    
    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    logger.error('Error getting public products:', error);
    next(error);
  }
};

// Récupérer un produit public par slug
export const getPublicProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { siteId } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }
    
    const product = await Product.findOne({
      slug,
      site: siteId,
      isActive: true,
    }).populate('category', 'name slug');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé',
      });
    }
    
    // Incrémenter les vues
    product.views += 1;
    await product.save();
    
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('Error getting public product:', error);
    next(error);
  }
};
