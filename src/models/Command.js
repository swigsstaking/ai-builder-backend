import mongoose from 'mongoose';

const commandSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['REFRESH_DATA', 'UPDATE_ETHDOCKER', 'VERSION_CHECK', 'PROVISION_VALIDATOR', 'FETCH_METRICS'],
    required: true
  },
  nodeId: {
    type: String, // L'agent qui va exécuter la commande
    required: true,
    index: true
  },
  serverId: {
    type: String, // Le serveur cible (pour multi-serveur)
    index: true
  },
  serverConfig: {
    host: String,
    username: String,
    port: Number
  },
  payload: {
    type: mongoose.Schema.Types.Mixed // Pour les données additionnelles (keystores, etc.)
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  logs: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

export default mongoose.model('Command', commandSchema);
