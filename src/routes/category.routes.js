import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getPublicCategories,
} from '../controllers/category.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkSiteAccess } from '../middleware/permissions.middleware.js';

const router = express.Router();

// Routes publiques (pour le frontend)
router.get('/public', getPublicCategories);

// Routes protégées (pour l'admin)
router.use(protect);

router.get('/', getCategories);
router.post('/', checkSiteAccess, createCategory);
router.get('/:id', getCategoryById);
router.put('/:id', checkSiteAccess, updateCategory);
router.delete('/:id', checkSiteAccess, deleteCategory);

export default router;
