import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
  },
  number: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
  },
  category: {
    type: String,
    enum: ['Moto - Scooter', 'Sensibilisation', 'Premiers secours', 'Voiture'],
    default: 'Moto - Scooter',
  },
  price: {
    amount: {
      type: Number,
      required: false,
    },
    currency: {
      type: String,
      default: 'CHF',
    },
    display: {
      type: String,
      required: false,
    },
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
  },
  dates: [{
    day: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
  }],
  maxParticipants: {
    type: Number,
  },
  currentParticipants: {
    type: Number,
    default: 0,
  },
  location: {
    type: String,
  },
  instructor: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'full', 'cancelled', 'completed'],
    default: 'active',
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for site and status
courseSchema.index({ site: 1, status: 1 });

export default mongoose.model('Course', courseSchema);
