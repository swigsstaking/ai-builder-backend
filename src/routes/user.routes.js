import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword,
  deleteUser,
  updateUserSites,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireAdmin, canModifyUser } from '../middleware/permissions.middleware.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(protect);

// Routes admin uniquement
router.get('/', requireAdmin, getUsers);
router.post('/', requireAdmin, createUser);
router.delete('/:id', requireAdmin, deleteUser);
router.put('/:id/sites', requireAdmin, updateUserSites);

// Routes avec vérification de permissions
router.get('/:id', getUserById); // Tout le monde peut voir les profils
router.put('/:id', canModifyUser, updateUser);
router.put('/:id/password', canModifyUser, changePassword);

export default router;
