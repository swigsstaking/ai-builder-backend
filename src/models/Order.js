import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true,
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true, // unique crée automatiquement un index
  },
  customer: {
    email: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phone: String,
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
      required: true,
    },
    productImage: String,
    variant: String,
    sku: String,
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
  }],
  subtotal: {
    type: Number,
    required: true,
  },
  shipping: {
    method: String,
    cost: {
      type: Number,
      default: 0,
    },
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: String,
    },
    trackingNumber: String,
    trackingUrl: String,
    carrier: String, // 'La Poste', 'DHL', 'UPS', 'FedEx', etc.
    shippedAt: Date,
  },
  billing: {
    firstName: String,
    lastName: String,
    company: String,
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: String,
    },
  },
  tax: {
    type: Number,
    default: 0,
  },
  promoCode: {
    code: String,
    type: String, // 'percentage' ou 'fixed'
    value: Number,
    discount: Number,
  },
  total: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'CHF',
  },
  displayCurrency: String,
  displayTotal: Number,
  status: {
    type: String,
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
    index: true,
  },
  payment: {
    method: {
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer', 'cash'],
      default: 'stripe',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: String,
    paidAt: Date,
  },
  notes: String,
  adminNotes: String,
  trackingNumber: String,
  statusHistory: [{
    status: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: String,
  }],
  stripePaymentIntentId: String,
  stripeCustomerId: String,
}, {
  timestamps: true,
});

// Index pour recherche et filtres
orderSchema.index({ site: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ orderNumber: 1 });

// Hook pour auto-générer orderNumber
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      site: this.site,
      createdAt: { $gte: new Date(year, 0, 1) },
    });
    this.orderNumber = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Hook pour ajouter à l'historique lors du changement de statut
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
