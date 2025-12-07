import express from 'express';
import {
  getContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
} from '../controllers/content.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';
import { checkSiteAccess } from '../middleware/permissions.middleware.js';

const router = express.Router();

// Routes GET avec authentification optionnelle (filtre si éditeur, sinon public)
router.route('/')
  .get(optionalAuth, getContent)
  .post(protect, checkSiteAccess, createContent);

router.route('/:id')
  .get(optionalAuth, getContentById)
  .put(protect, checkSiteAccess, updateContent)
  .delete(protect, checkSiteAccess, deleteContent);

export default router;
