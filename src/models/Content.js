import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  section: {
    type: String,
    required: [true, 'Section identifier is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'testimonial', 'feature', 'hero', 'cta', 'menu', 'event', 'projects', 'gallery', 'custom'],
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for site and section
contentSchema.index({ site: 1, section: 1 });

export default mongoose.model('Content', contentSchema);
