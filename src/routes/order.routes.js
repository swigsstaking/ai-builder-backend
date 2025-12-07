import express from 'express';
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderTracking,
  updateOrderNotes,
  deleteOrder,
  createPublicOrder,
  getPublicOrder,
  getCustomerOrders,
} from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { protectCustomer } from '../middleware/customerAuth.middleware.js';
import { checkSiteAccess } from '../middleware/permissions.middleware.js';
import { requireAdmin } from '../middleware/permissions.middleware.js';

const router = express.Router();

// Routes publiques (pour le frontend)
router.post('/public', createPublicOrder);
router.get('/public/:orderNumber', getPublicOrder);

// Route pour les customers authentifiés
router.get('/customer', protectCustomer, getCustomerOrders);

// Routes protégées (pour l'admin)
router.use(protect);

router.get('/', getOrders);
router.get('/:id', checkSiteAccess, getOrderById);
router.put('/:id/status', checkSiteAccess, updateOrderStatus);
router.put('/:id/tracking', checkSiteAccess, updateOrderTracking);
router.put('/:id/notes', checkSiteAccess, updateOrderNotes);
router.delete('/:id', requireAdmin, deleteOrder);

export default router;
