import express from 'express';
import {
  register,
  login,
  googleLogin,
  getProfile,
  updateProfile,
  updatePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getOrders,
} from '../controllers/customer.controller.js';
import {
  getAllCustomers,
  getCustomerById,
  updateCustomerStatus,
} from '../controllers/customerAdmin.controller.js';
import { protectCustomer } from '../middleware/customerAuth.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);

// Routes admin (pour l'Admin Panel)
router.get('/admin', protect, getAllCustomers);
router.get('/admin/:id', protect, getCustomerById);
router.patch('/admin/:id/status', protect, updateCustomerStatus);

// Routes protégées (customer authentifié)
router.use(protectCustomer);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

// Gestion des adresses
router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);
router.put('/addresses/:addressId/default', setDefaultAddress);

// Commandes du customer
router.get('/orders', getOrders);

export default router;
