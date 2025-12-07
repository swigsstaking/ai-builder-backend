import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  type: {
    type: String,
    enum: ['contact', 'gift-card'],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
  },
  // Pour les bons cadeaux
  giftCard: {
    amount: Number,
    recipientName: String,
    recipientEmail: String,
    deliveryDate: Date,
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new',
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  emailError: {
    type: String,
  },
}, {
  timestamps: true,
});

// Index pour recherche rapide
contactSchema.index({ site: 1, createdAt: -1 });
contactSchema.index({ status: 1 });

export default mongoose.model('Contact', contactSchema);
