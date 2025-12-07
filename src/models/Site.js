import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true,
  },
  // Admin propriétaire du site (assigné par superadmin)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  slug: {
    type: String,
    required: [true, 'Site slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    trim: true,
  },
  // Domaines multiples (test, staging, production)
  domains: [{
    url: {
      type: String,
      required: true,
      trim: true,
    },
    environment: {
      type: String,
      enum: ['test', 'staging', 'production'],
      default: 'test',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  }],
  description: {
    type: String,
    trim: true,
  },
  logo: {
    url: {
      type: String,
    },
    alt: {
      type: String,
      default: 'Logo',
    },
  },
  favicon: {
    type: String,
  },
  theme: {
    primaryColor: {
      type: String,
      default: '#dc2626',
    },
    secondaryColor: {
      type: String,
      default: '#1f2937',
    },
    fontFamily: {
      type: String,
      default: 'Helvetica Neue, Arial, sans-serif',
    },
  },
  contact: {
    phone: String,
    email: String,
    address: String,
    city: String,
    postalCode: String,
    country: String,
    whatsapp: String,
    // Email pour recevoir les formulaires
    formsEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  // Configuration SMTP personnalisée (optionnel)
  smtp: {
    enabled: {
      type: Boolean,
      default: false, // Par défaut, utiliser SMTP swigs.online
    },
    host: String,
    port: Number,
    secure: Boolean,
    user: String,
    pass: String,
    fromEmail: String, // Email expéditeur (ex: noreply@votresite.com)
    fromName: String,  // Nom expéditeur (ex: "Votre Site")
  },
  social: {
    facebook: String,
    instagram: String,
    tiktok: String,
    linkedin: String,
    twitter: String,
  },
  settings: {
    language: {
      type: String,
      default: 'fr',
    },
    timezone: {
      type: String,
      default: 'Europe/Zurich',
    },
    analytics: {
      googleAnalyticsId: String,
      ga4PropertyId: String, // Format: properties/123456789
    },
  },
  // Pages du site pour le SEO
  pages: [{
    value: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  }],
  // Sections du site pour le Content
  sections: [{
    value: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  }],
  // Configuration du type de site et contenu
  siteType: {
    type: String,
    enum: ['auto-ecole', 'restaurant', 'ecommerce', 'blog', 'portfolio', 'custom'],
    default: 'custom',
  },
  contentConfig: {
    primaryType: {
      type: String,
      enum: ['courses', 'menu', 'products', 'posts', 'gallery', 'projects', 'custom'],
      default: 'custom',
    },
    enabledModules: [{
      type: String,
      enum: ['courses', 'menu', 'events', 'products', 'blog', 'gallery', 'testimonials', 'projects'],
    }],
  },
  // Configuration de déploiement
  deployment: {
    repository: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      default: 'main',
    },
    buildCommand: {
      type: String,
      default: 'npm run build',
    },
    outputDir: {
      type: String,
      default: 'dist',
    },
    deployPath: {
      type: String,
      trim: true,
    },
    framework: {
      type: String,
      enum: ['react', 'nextjs', 'astro', 'eleventy', 'vue', 'svelte', 'custom'],
      default: 'react',
    },
  },
  // Configuration API pour communication inter-services
  apiConfig: {
    baseUrl: {
      type: String,
      trim: true,
    },
    serviceToken: {
      type: String,
      trim: true,
    },
  },
  // Configuration Stripe (pour sites e-commerce)
  stripeConfig: {
    secretKey: {
      type: String,
      trim: true,
      select: false, // Ne pas retourner par défaut (sécurité)
    },
    publishableKey: {
      type: String,
      trim: true,
    },
    webhookSecret: {
      type: String,
      trim: true,
      select: false, // Ne pas retourner par défaut (sécurité)
    },
    accountId: {
      type: String,
      trim: true,
    },
  },
  // Configuration Google OAuth (pour authentification customers)
  googleOAuthConfig: {
    clientId: {
      type: String,
      trim: true,
    },
    clientSecret: {
      type: String,
      trim: true,
      select: false, // Ne pas retourner par défaut (sécurité)
    },
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Site', siteSchema);
