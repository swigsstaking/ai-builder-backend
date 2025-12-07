import express from 'express';
import {
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
} from '../controllers/site.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = express.Router();

// Routes GET avec authentification optionnelle (filtre si éditeur, sinon public)
// IMPORTANT: Pas de cache car le résultat dépend du rôle de l'utilisateur
router.get('/', optionalAuth, getSites);
router.get('/:id', optionalAuth, getSite);

// Routes protégées (POST, PUT, DELETE) - nécessitent authentification
router.post('/', protect, authorize('admin'), createSite);
router.put('/:id', protect, authorize('admin'), updateSite);
router.delete('/:id', protect, authorize('admin'), deleteSite);

export default router;
