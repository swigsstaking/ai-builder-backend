import mongoose from 'mongoose';

const seoSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  page: {
    type: String,
    required: [true, 'Page identifier is required'],
    trim: true,
  },
  title: {
    type: String,
    required: [true, 'SEO title is required'],
    maxlength: [60, 'Title should not exceed 60 characters'],
  },
  description: {
    type: String,
    required: [true, 'SEO description is required'],
    maxlength: [160, 'Description should not exceed 160 characters'],
  },
  keywords: [{
    type: String,
    trim: true,
  }],
  ogTitle: {
    type: String,
    maxlength: [60, 'OG title should not exceed 60 characters'],
  },
  ogDescription: {
    type: String,
    maxlength: [160, 'OG description should not exceed 160 characters'],
  },
  ogImage: {
    type: String,
  },
  canonicalUrl: {
    type: String,
  },
  robots: {
    type: String,
    enum: ['index,follow', 'noindex,follow', 'index,nofollow', 'noindex,nofollow'],
    default: 'index,follow',
  },
  structuredData: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Compound index for site and page
seoSchema.index({ site: 1, page: 1 }, { unique: true });

export default mongoose.model('SEO', seoSchema);
