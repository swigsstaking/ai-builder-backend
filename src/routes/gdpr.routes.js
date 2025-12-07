import express from 'express';
import {
  exportCustomerData,
  deleteCustomerAccount,
  updateConsent,
  getConsent,
} from '../controllers/gdpr.controller.js';
import { protectCustomer } from '../middleware/customerAuth.middleware.js';

const router = express.Router();

// Toutes les routes RGPD nécessitent une authentification client
router.use(protectCustomer);

router.get('/export', exportCustomerData);
router.delete('/delete-account', deleteCustomerAccount);
router.get('/consent', getConsent);
router.put('/consent', updateConsent);

export default router;
