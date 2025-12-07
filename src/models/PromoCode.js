import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  minAmount: {
    type: Number,
    default: 0,
  },
  maxDiscount: Number, // Pour les pourcentages
  usageLimit: {
    type: Number,
    default: null, // null = illimité
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validUntil: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  excludedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
}, {
  timestamps: true,
});

// Index unique sur code + site
promoCodeSchema.index({ code: 1, site: 1 }, { unique: true });

// Méthode pour vérifier si le code est valide
promoCodeSchema.methods.isValid = function() {
  const now = new Date();
  
  // Vérifier si actif
  if (!this.isActive) {
    return { valid: false, message: 'Code promo désactivé' };
  }
  
  // Vérifier dates
  if (this.validFrom && now < this.validFrom) {
    return { valid: false, message: 'Code promo pas encore valide' };
  }
  
  if (this.validUntil && now > this.validUntil) {
    return { valid: false, message: 'Code promo expiré' };
  }
  
  // Vérifier limite d'utilisation
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'Code promo épuisé' };
  }
  
  return { valid: true };
};

// Méthode pour calculer la réduction
promoCodeSchema.methods.calculateDiscount = function(subtotal, items = []) {
  let discount = 0;
  
  // Vérifier montant minimum
  if (subtotal < this.minAmount) {
    return 0;
  }
  
  // Calculer selon le type
  if (this.type === 'percentage') {
    discount = (subtotal * this.value) / 100;
    
    // Appliquer max discount si défini
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    // Fixed amount
    discount = this.value;
  }
  
  // Ne pas dépasser le subtotal
  if (discount > subtotal) {
    discount = subtotal;
  }
  
  return Math.round(discount * 100) / 100; // Arrondir à 2 décimales
};

export default mongoose.model('PromoCode', promoCodeSchema);
