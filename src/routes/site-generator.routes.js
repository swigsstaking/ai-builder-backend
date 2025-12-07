/**
 * Site Generator Routes
 * Routes pour la generation de projets de site
 */

import express from 'express';
import {
  getGeneratorConfig,
  validateConfig,
  previewProject,
  downloadProject,
  generateSlugEndpoint,
} from '../controllers/site-generator.controller.js';

const router = express.Router();

// Routes publiques (pas d'authentification requise pour l'AI Builder)

// GET /api/site-generator/config - Configuration disponible
router.get('/config', getGeneratorConfig);

// POST /api/site-generator/validate - Valider une configuration
router.post('/validate', validateConfig);

// POST /api/site-generator/preview - Apercu du projet
router.post('/preview', previewProject);

// POST /api/site-generator/download - Telecharger le projet ZIP
router.post('/download', downloadProject);

// POST /api/site-generator/slug - Generer un slug
router.post('/slug', generateSlugEndpoint);

export default router;
