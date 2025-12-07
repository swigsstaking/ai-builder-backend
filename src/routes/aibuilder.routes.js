import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import {
  generatePreview,
  regeneratePreview,
  createCheckoutSession,
  handleWebhook,
  getProjectStatus,
  getStripePublishableKey,
  uploadImages,
  regenerateWithImages
} from '../controllers/aibuilder.controller.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10, // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Public routes - no authentication required

// AI Generation
router.post('/generate', generatePreview);
router.post('/regenerate', regeneratePreview);
router.post('/regenerate-with-images', regenerateWithImages);

// Image upload with WebP conversion
router.post('/upload', upload.array('images', 10), uploadImages);

// Project status
router.get('/project/:projectId', getProjectStatus);

// Stripe
router.get('/stripe-key', getStripePublishableKey);
router.post('/checkout', createCheckoutSession);

// Webhook - needs raw body for signature verification
// Note: This route should be registered with express.raw() middleware in server.js
router.post('/webhook', handleWebhook);

export default router;
