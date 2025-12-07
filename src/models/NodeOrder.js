import mongoose from 'mongoose';
import crypto from 'crypto';

// Encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.KEYSTORE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const IV_LENGTH = 16;

// Encrypt function
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt function
function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const keystoreSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  encryptedContent: { type: String, required: true }, // AES-256 encrypted JSON
  pubkey: { type: String }, // Extracted from keystore for reference
  validatorIndex: { type: Number }, // If known
});

const nodeOrderSchema = new mongoose.Schema({
  // Customer info
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  email: { type: String, required: true },
  
  // Order details
  orderType: {
    type: String,
    enum: ['create', 'migrate'],
    required: true
  },
  network: {
    type: String,
    enum: ['ethereum', 'lukso', 'gnosis'],
    default: 'ethereum'
  },
  validatorCount: {
    type: Number,
    default: 1
  },
  
  // Payment
  stripeSessionId: { type: String },
  stripeSubscriptionId: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },
  pricePerValidator: { type: Number },
  currency: { type: String, default: 'USD' },
  
  // Keystores (encrypted)
  keystores: [keystoreSchema],
  keystorePassword: { type: String }, // AES-256 encrypted password
  
  // Deposit data (public, not encrypted)
  depositData: { type: mongoose.Schema.Types.Mixed },
  
  // Processing status
  status: {
    type: String,
    enum: ['pending_payment', 'pending_keystores', 'pending_setup', 'in_progress', 'active', 'suspended', 'cancelled'],
    default: 'pending_payment'
  },
  
  // Admin notes
  adminNotes: { type: String },
  
  // Server assignment
  assignedServer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NodeServer'
  },
  
  // Timestamps
  paidAt: { type: Date },
  setupStartedAt: { type: Date },
  activatedAt: { type: Date },
  
  // Cancellation
  cancellationRequested: { type: Boolean, default: false },
  cancellationRequestedAt: { type: Date },
  cancellationReason: { type: String },
  cancelledAt: { type: Date }
}, {
  timestamps: true
});

// Method to add encrypted keystore
nodeOrderSchema.methods.addKeystore = function(filename, content, pubkey) {
  const encryptedContent = encrypt(JSON.stringify(content));
  this.keystores.push({
    filename,
    encryptedContent,
    pubkey
  });
};

// Method to get decrypted keystores (admin only)
nodeOrderSchema.methods.getDecryptedKeystores = function() {
  return this.keystores.map(ks => ({
    filename: ks.filename,
    content: JSON.parse(decrypt(ks.encryptedContent)),
    pubkey: ks.pubkey,
    validatorIndex: ks.validatorIndex
  }));
};

// Method to set encrypted password
nodeOrderSchema.methods.setKeystorePassword = function(password) {
  this.keystorePassword = encrypt(password);
};

// Method to get decrypted password (admin only)
nodeOrderSchema.methods.getKeystorePassword = function() {
  if (!this.keystorePassword) return null;
  return decrypt(this.keystorePassword);
};

// Static method to get orders for admin dashboard
nodeOrderSchema.statics.getAdminDashboard = async function(filters = {}) {
  const query = {};
  
  if (filters.status) query.status = filters.status;
  if (filters.network) query.network = filters.network;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  
  return this.find(query)
    .populate('customer', 'firstName lastName email')
    .populate('assignedServer', 'name')
    .sort({ createdAt: -1 });
};

export default mongoose.model('NodeOrder', nodeOrderSchema);
