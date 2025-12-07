import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
  },
  shortDescription: {
    type: String,
  },
  price: {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'CHF',
    },
    compareAtPrice: {
      type: Number,
    },
    costPrice: {
      type: Number, // Prix de revient pour calcul marge
    },
    taxRate: {
      type: Number,
      default: 8.1, // TVA Suisse par défaut (8.1%)
    },
    taxIncluded: {
      type: Boolean,
      default: true, // Prix TTC par défaut
    },
    exchangeRates: {
      EUR: { type: Number, default: 0.95 },
      USD: { type: Number, default: 1.10 },
      CNY: { type: Number, default: 7.20 },
      HKD: { type: Number, default: 8.50 },
    },
  },
  images: [String],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    default: null,
  },
  stock: {
    quantity: {
      type: Number,
      default: 0,
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
    allowBackorder: {
      type: Boolean,
      default: false,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
  },
  shipping: {
    weight: {
      type: Number, // en grammes
    },
    dimensions: {
      length: Number, // en cm
      width: Number,
      height: Number,
    },
    requiresShipping: {
      type: Boolean,
      default: true,
    },
  },
  variants: [{
    name: String,
    sku: String,
    price: Number,
    stock: Number,
    attributes: mongoose.Schema.Types.Mixed,
  }],
  seo: {
    title: String,
    description: String,
    keywords: [String],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  sales: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index composé pour unicité slug par site
productSchema.index({ site: 1, slug: 1 }, { unique: true });
productSchema.index({ site: 1, isActive: 1, order: 1 });
productSchema.index({ site: 1, category: 1 });

// Hook pour auto-générer slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Hook pour notification stock faible
productSchema.post('save', async function() {
  const threshold = this.stock.lowStockThreshold || 5;
  if (this.stock.trackInventory && this.stock.quantity <= threshold && this.stock.quantity > 0) {
    // TODO: Envoyer email admin (à implémenter avec le système SMTP)
    console.log(`⚠️ Stock faible pour ${this.name}: ${this.stock.quantity} restant(s)`);
  }
});

// Méthode pour calculer le prix HT/TTC
productSchema.methods.calculatePrices = function() {
  const amount = this.price.amount;
  const taxRate = this.price.taxRate || 0;
  const taxIncluded = this.price.taxIncluded;
  
  if (taxIncluded) {
    // Prix TTC → calculer HT
    const priceHT = amount / (1 + taxRate / 100);
    const taxAmount = amount - priceHT;
    return {
      priceHT: Math.round(priceHT * 100) / 100,
      priceTTC: amount,
      taxAmount: Math.round(taxAmount * 100) / 100,
    };
  } else {
    // Prix HT → calculer TTC
    const taxAmount = amount * (taxRate / 100);
    const priceTTC = amount + taxAmount;
    return {
      priceHT: amount,
      priceTTC: Math.round(priceTTC * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
    };
  }
};

// Méthode pour calculer la marge
productSchema.methods.calculateMargin = function() {
  if (!this.price.costPrice) return null;
  
  const prices = this.calculatePrices();
  const margin = prices.priceHT - this.price.costPrice;
  const marginPercent = (margin / this.price.costPrice) * 100;
  
  return {
    margin: Math.round(margin * 100) / 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
  };
};

// Middleware pour convertir SKU vide en null
productSchema.pre('save', function(next) {
  if (this.sku === '' || this.sku === undefined) {
    this.sku = null;
  }
  next();
});

productSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Gérer update direct
  if (update.sku !== undefined && (update.sku === '' || update.sku === null)) {
    update.sku = null;
  }
  
  // Gérer $set
  if (update.$set) {
    if (update.$set.sku !== undefined && (update.$set.sku === '' || update.$set.sku === null)) {
      update.$set.sku = null;
    }
  }
  
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
