import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NodeServer from './src/models/NodeServer.js';
import User from './src/models/User.js';
import crypto from 'crypto';

dotenv.config();

const createServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // 1. Trouver ou créer un User Admin (pour être propriétaire du serveur)
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('⚠️ Aucun admin trouvé, création d\'un admin temporaire...');
      // Création simplifiée (hash password à faire en prod)
      admin = await User.create({
        email: 'admin@swigs.online',
        password: 'password123',
        role: 'admin',
        username: 'Admin'
      });
    }

    // 2. Générer une clé API sécurisée pour l'Agent
    const agentKey = crypto.randomBytes(32).toString('hex');

    // 3. Créer le NodeServer
    const server = await NodeServer.findOneAndUpdate(
      { name: 'NUC-EthDocker-01' },
      {
        name: 'NUC-EthDocker-01',
        ipAddress: '192.168.110.64', // IP du serveur de nœuds
        location: 'Local Network',
        provider: 'SelfNodes',
        agentKey: agentKey, // On stocke la clé (hashée idéalement, mais brute pour ce script de setup)
        status: 'offline', // Sera mis à jour par l'agent
        user: admin._id
      },
      { upsert: true, new: true }
    );

    console.log('\n🎉 SERVEUR CRÉÉ AVEC SUCCÈS !');
    console.log('---------------------------------------------------');
    console.log(`📝 NODE_ID:        ${server._id}`);
    console.log(`🔑 NODE_AGENT_KEY: ${agentKey}`);
    console.log(`🌐 CMS_URL:        http://192.168.110.73:3000/api`);
    console.log('---------------------------------------------------');
    console.log('👉 Copiez ces valeurs pour le script d\'installation sur le Pi.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

createServer();
