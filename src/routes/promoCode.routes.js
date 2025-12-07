import express from 'express';
import {
  createPromoCode,
  getPromoCodes,
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
  validatePromoCode,
} from '../controllers/promoCode.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkSiteAccess } from '../middleware/permissions.middleware.js';

const router = express.Router();

// Route publique pour valider un code promo
router.post('/validate', validatePromoCode);

// Routes protégées (admin/editor)
router.use(protect);

router.route('/')
  .get(getPromoCodes)
  .post(checkSiteAccess, createPromoCode);

router.route('/:id')
  .get(getPromoCodeById)
  .put(checkSiteAccess, updatePromoCode)
  .delete(checkSiteAccess, deletePromoCode);

export default router;
