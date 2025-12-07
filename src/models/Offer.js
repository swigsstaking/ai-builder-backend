import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index pour rechercher les offres actives dans une période
offerSchema.index({ site: 1, validFrom: 1, validUntil: 1, status: 1 });

// Méthode pour vérifier si l'offre est valide maintenant
offerSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.validFrom <= now && 
         this.validUntil >= now;
};

// Méthode statique pour récupérer les offres valides
offerSchema.statics.getValidOffers = function(siteId) {
  const now = new Date();
  return this.find({
    site: siteId,
    status: 'active',
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  }).sort({ order: 1, createdAt: -1 });
};

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
