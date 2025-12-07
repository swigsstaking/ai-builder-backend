import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadFile,
  getFiles,
  deleteFile,
} from '../controllers/media.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import Site from '../models/Site.js';

const router = express.Router();

// Configure multer for file uploads
// On stocke temporairement car req.body n'est pas accessible dans destination
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempUploadPath = process.env.UPLOAD_PATH || '/var/www/uploads';
    // Créer le dossier temp s'il n'existe pas
    if (!fs.existsSync(tempUploadPath)) {
      fs.mkdirSync(tempUploadPath, { recursive: true, mode: 0o775 });
    }
    cb(null, tempUploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images and PDF files
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/pdf' || /image\/(jpeg|jpg|png|gif|webp|svg\+xml)/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default (pour PDF)
  },
  fileFilter,
});

router.use(protect);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.delete('/:id', deleteFile);

export default router;
