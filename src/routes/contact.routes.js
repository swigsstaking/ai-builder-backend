import express from 'express';
import { 
  submitContact, 
  submitGiftCard,
  getContacts,
  updateContactStatus,
  deleteContact
} from '../controllers/contact.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting pour les formulaires publics (anti-spam)
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 soumissions max par IP
  message: 'Trop de soumissions, veuillez réessayer dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes publiques (formulaires)
router.post('/submit', formLimiter, submitContact);
router.post('/gift-card', formLimiter, submitGiftCard);

// Routes protégées (admin)
router.get('/', protect, getContacts);
router.patch('/:id/status', protect, updateContactStatus);
router.delete('/:id', protect, deleteContact);

export default router;
