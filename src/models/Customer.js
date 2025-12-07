import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const customerSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  email: {
    type: String,
    required: [true, 'Email requis'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Mot de passe requis'],
    minlength: 6,
    select: false, // Ne pas retourner par défaut
  },
  firstName: {
    type: String,
    required: [true, 'Prénom requis'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Nom requis'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  telegramUserId: {
    type: String,
    trim: true,
  },
  // Adresses sauvegardées
  addresses: [{
    label: String, // "Domicile", "Bureau", etc.
    address: String,
    city: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Suisse',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  }],
  // Préférences
  preferences: {
    telegramNotifications: {
      type: Boolean,
      default: false,
    },
    newsletter: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      enum: ['fr', 'de', 'it', 'en'],
      default: 'fr',
    },
  },
  // Statut
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  // RGPD
  gdpr: {
    marketingConsent: {
      type: Boolean,
      default: false,
    },
    dataProcessingConsent: {
      type: Boolean,
      default: true, // Requis pour utiliser le service
    },
    consentDate: Date,
    lastDataExport: Date,
  },
}, {
  timestamps: true,
});

// Hash password avant sauvegarde
customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode pour comparer les mots de passe
customerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir le nom complet
customerSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Méthode pour obtenir l'adresse par défaut
customerSchema.methods.getDefaultAddress = function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

export default mongoose.model('Customer', customerSchema);
