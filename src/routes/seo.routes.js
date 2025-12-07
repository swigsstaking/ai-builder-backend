import express from 'express';
import {
  getSEO,
  getSEOById,
  upsertSEO,
  deleteSEO,
  syncFromSite,
} from '../controllers/seo.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkSiteAccess } from '../middleware/permissions.middleware.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques (GET)
router.get('/', getSEO);
router.get('/:id', getSEOById);

// Routes protégées (POST, DELETE) avec vérification d'accès au site
router.post('/', protect, checkSiteAccess, upsertSEO);
router.delete('/:id', protect, checkSiteAccess, deleteSEO);

// Route admin pour synchroniser le SEO depuis le site frontend
router.post('/sync-from-site/:siteId', protect, authorize('admin'), syncFromSite);

export default router;
