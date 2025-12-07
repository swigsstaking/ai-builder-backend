import express from 'express';
import {
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  deleteOffer
} from '../controllers/offer.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkSiteAccess } from '../middleware/permissions.middleware.js';

const router = express.Router();

// Routes protégées avec vérification d'accès au site
router.use(protect);

router.route('/')
  .get(getOffers)
  .post(checkSiteAccess, createOffer);

router.route('/:id')
  .get(getOfferById)
  .put(checkSiteAccess, updateOffer)
  .delete(checkSiteAccess, deleteOffer);

export default router;
