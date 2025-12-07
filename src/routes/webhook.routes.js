import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { rebuildSite, getRebuildStatus, handleStripeWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// Webhook Stripe (DOIT être AVANT express.json() dans server.js)
// Pas de middleware protect car Stripe envoie les webhooks
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Déclencher le rebuild (protégé - admin seulement)
router.post('/rebuild', protect, rebuildSite);

// Obtenir le statut du rebuild
router.get('/rebuild/status', protect, getRebuildStatus);

export default router;
