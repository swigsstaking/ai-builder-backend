import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
  getPublicProducts,
  getPublicProductBySlug,
} from '../controllers/product.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkSiteAccess } from '../middleware/permissions.middleware.js';

const router = express.Router();

// Routes publiques (pour le frontend)
router.get('/public', getPublicProducts);
router.get('/public/:slug', getPublicProductBySlug);

// Routes protégées (pour l'admin)
router.use(protect);

router.get('/', getProducts);
router.post('/', checkSiteAccess, createProduct);
router.put('/reorder', checkSiteAccess, reorderProducts);
router.get('/:id', getProductById);
router.put('/:id', checkSiteAccess, updateProduct);
router.delete('/:id', checkSiteAccess, deleteProduct);

export default router;
