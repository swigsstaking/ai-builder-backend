import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import logger from './src/utils/logger.js';
import rateLimit from 'express-rate-limit';
import './src/config/redis.js'; // Initialize Redis

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import siteRoutes from './src/routes/site.routes.js';
import seoRoutes from './src/routes/seo.routes.js';
import courseRoutes from './src/routes/course.routes.js';
import contentRoutes from './src/routes/content.routes.js';
import mediaRoutes from './src/routes/media.routes.js';
import webhookRoutes from './src/routes/webhook.routes.js';
import contactRoutes from './src/routes/contact.routes.js';
import userRoutes from './src/routes/user.routes.js';
import offerRoutes from './src/routes/offer.routes.js';
import publicRoutes from './src/routes/public.routes.js';
import productRoutes from './src/routes/product.routes.js';
import categoryRoutes from './src/routes/category.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import customerRoutes from './src/routes/customer.routes.js';
import promoCodeRoutes from './src/routes/promoCode.routes.js';
import analyticsRoutes from './src/routes/analytics.routes.js';
import gdprRoutes from './src/routes/gdpr.routes.js';
import nodeRoutes from './src/routes/node.routes.js';
import siteGeneratorRoutes from './src/routes/site-generator.routes.js';

import { initTelegramBot } from './src/services/telegram.service.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - IMPORTANT pour Nginx
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'https://admin.swigs.online',
  'https://monitoring.swigs.online',
  'https://control.swigs.online',
  'https://speed-l.swigs.online',
  'https://buffet-de-la-gare.swigs.online',
  'https://buffetdelagarechezclaude.ch',
  'https://www.buffetdelagarechezclaude.ch'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permettre les requêtes sans origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Log TOUTES les requêtes pour debug
    logger.info(`📥 CORS request from: ${origin}`);
    
    if (allowedOrigins.includes(origin)) {
      logger.info(`✅ CORS allowed: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`❌ CORS blocked origin: ${origin}`);
      logger.warn(`📋 Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Log la config CORS au démarrage
logger.info(`🔒 CORS configured for origins: ${allowedOrigins.join(', ')}`);

app.use(cors(corsOptions));

// ⚠️ IMPORTANT: Webhooks Stripe AVANT express.json() pour vérifier signature
app.use('/api/webhook', webhookRoutes);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Augmenté pour éviter les problèmes pendant le développement
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Augmenté à 1000 requêtes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Middleware: Vérifier connexion MongoDB
app.use('/api/', (req, res, next) => {
  if (mongoose.connection.readyState !== 1 && !req.path.includes('/health')) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable. Please try again in a moment.',
      error: 'SERVICE_UNAVAILABLE'
    });
  }
  next();
});

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// Routes publiques (AVANT les routes protégées)
app.use('/api/public', publicRoutes);

// Routes protégées
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/site-generator', siteGeneratorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: mongoStatus === 'connected' ? 'OK' : 'ERROR',
    message: 'SWIGS CMS API is running',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    logger.debug(err.stack);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// MongoDB connection with auto-reconnect
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms';
    logger.info('🔎 MONGODB URI USED BY APP: ' + uri);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.success('✅ Connected to MongoDB');
  } catch (err) {
    logger.error('❌ MongoDB connection error:', err.message);
    logger.info('⏳ Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Handle MongoDB disconnection
mongoose.connection.on('disconnected', () => {
  logger.error('❌ MongoDB disconnected! Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.success('✅ MongoDB reconnected');
});

// Connect to MongoDB
connectDB();

// Init Telegram Bot
initTelegramBot();

// Start server (même si MongoDB n'est pas encore connecté)
app.listen(PORT, () => {
  logger.success(`🚀 SWIGS CMS API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close();
  process.exit(0);
});
