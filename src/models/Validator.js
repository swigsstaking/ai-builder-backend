import mongoose from 'mongoose';

const validatorSchema = new mongoose.Schema({
  publicKey: {
    type: String,
    sparse: true, // Allow null/undefined values with unique index
    unique: true,
    index: true
  },
  index: {
    type: Number, // Beacon Chain Index
    index: true
  },
  network: {
    type: String,
    enum: ['ethereum', 'lukso', 'gnosis'],
    default: 'ethereum'
  },
  serviceType: {
    type: String,
    enum: ['monitoring', 'managed'], // monitoring = just watching, managed = Selfnodes hosting
    default: 'monitoring'
  },
  name: {
    type: String, // User friendly name "Validator 1"
    default: 'My Validator'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NodeServer'
  },
  nodeOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NodeOrder'
  },
  status: {
    type: String,
    enum: [
      'pending', // Just created, waiting for deposit/activation
      'pending_queued', 
      'active_ongoing',
      'active_online', // Validator is active and attesting
      'active_offline',  // Validator is active but not attesting
      'active_exiting',
      'exiting_online',
      'exiting_offline',
      'exited', // Generic exited
      'exited_unslashed', 
      'exited_slashed',
      'withdrawal_possible', 
      'withdrawal_done',
      'slashed',
      'slashing_online',
      'slashing_offline'
    ],
    default: 'pending'
  },
  balance: {
    type: Number, // In ETH
    default: 0
  },
  effectiveBalance: {
    type: Number, // In ETH
    default: 32
  },
  rewards: {
    total: { type: Number, default: 0 }, // Total historical rewards
    lastEpoch: { type: Number, default: 0 },
    lastMonth: { type: Number, default: 0 }
  },
  performance: {
    attestationEffectiveness: { type: Number, default: 100 }, // Percentage 0-100
    proposalsMissed: { type: Number, default: 0 }
  },
  withdrawalCredentials: {
    type: String,
    select: false // Security: hide by default
  },
  activationEpoch: Number,
  exitEpoch: Number,
  lastAlertSent: {
    type: Date,
    default: null
  },
  alertCount: {
    type: Number,
    default: 0  // Count consecutive offline alerts (reset when back online)
  },
  totalAlertCount: {
    type: Number,
    default: 0  // Total alerts ever sent (for analytics)
  },
  lastKnownStatus: {
    type: String,
    default: null
  },
  // Cancellation fields
  cancellationRequested: {
    type: Boolean,
    default: false
  },
  cancellationRequestedAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  }
}, {
  timestamps: true
});

export default mongoose.model('Validator', validatorSchema);
