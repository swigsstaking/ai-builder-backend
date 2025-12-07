import mongoose from 'mongoose';

const nodeServerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  ipAddress: {
    type: String, // Local IP or Hostname
    required: true
  },
  sshUser: {
    type: String,
    default: 'swigs'
  },
  network: {
    type: String,
    enum: ['ethereum', 'gnosis', 'lukso'],
    default: 'ethereum'
  },
  type: {
    type: String,
    enum: ['execution', 'consensus', 'combined'],
    default: 'combined'
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'syncing', 'maintenance', 'updating'],
    default: 'offline'
  },
  softwareVersions: {
    ethDocker: String,
    executionClient: String,
    consensusClient: String
  },
  resources: {
    cpuUsage: Number, // Percentage
    ramUsage: Number, // GB used
    ramTotal: Number, // GB total
    diskUsage: Number, // Percentage
    diskTotal: Number // GB total
  },
  lastHeartbeat: {
    type: Date
  },
  sshStatus: {
    type: String,
    enum: ['connected', 'disconnected', 'auth_failed'],
    default: 'disconnected'
  }
}, {
  timestamps: true
});

export default mongoose.model('NodeServer', nodeServerSchema);
