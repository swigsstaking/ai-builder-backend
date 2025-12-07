/**
 * Script pour configurer le superadmin
 * Usage: node scripts/setup-superadmin.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms';

async function setupSuperadmin() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      role: String,
      sites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
      managedSites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      isActive: Boolean,
    }));

    // Trouver le compte admin@swigs.online
    const adminEmail = 'admin@swigs.online';
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.log(`❌ Utilisateur ${adminEmail} non trouvé`);
      console.log('');
      console.log('Utilisateurs existants:');
      const allUsers = await User.find().select('email role');
      allUsers.forEach(u => console.log(`  - ${u.email} (${u.role})`));
      process.exit(1);
    }

    console.log(`\n📋 Utilisateur trouvé: ${user.email}`);
    console.log(`   Rôle actuel: ${user.role}`);

    // Mettre à jour en superadmin
    user.role = 'superadmin';
    
    // Demander un nouveau mot de passe
    const newPassword = process.argv[2];
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      console.log('   ✅ Nouveau mot de passe défini');
    } else {
      console.log('   ⚠️  Pas de nouveau mot de passe (ajouter en argument: node scripts/setup-superadmin.js MON_MOT_DE_PASSE)');
    }

    await user.save();
    console.log(`\n✅ ${user.email} est maintenant SUPERADMIN`);

    // Afficher tous les utilisateurs
    console.log('\n📊 Liste des utilisateurs:');
    const allUsers = await User.find().select('email role name');
    allUsers.forEach(u => {
      const roleEmoji = u.role === 'superadmin' ? '👑' : u.role === 'admin' ? '🔧' : '✏️';
      console.log(`  ${roleEmoji} ${u.email} - ${u.name} (${u.role})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

setupSuperadmin();
