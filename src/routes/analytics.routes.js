import express from 'express';
import {
  getOverview,
  getSalesData,
  getTopProducts,
  getCustomerStats,
  getOrderStats,
  exportData,
  // Google Analytics 4
  getGA4Overview,
  getGA4Traffic,
  getGA4Sources,
  getGA4TopPages,
  getGA4Devices,
  getGA4Comparison,
} from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Toutes les routes analytics sont protégées
router.use(protect);

// Routes e-commerce (existantes)
router.get('/overview', getOverview);
router.get('/sales', getSalesData);
router.get('/products', getTopProducts);
router.get('/customers', getCustomerStats);
router.get('/orders', getOrderStats);
router.get('/export', exportData);

// Routes Google Analytics 4
router.get('/ga4/overview', getGA4Overview);
router.get('/ga4/traffic', getGA4Traffic);
router.get('/ga4/sources', getGA4Sources);
router.get('/ga4/pages', getGA4TopPages);
router.get('/ga4/devices', getGA4Devices);
router.get('/ga4/comparison', getGA4Comparison);

export default router;
