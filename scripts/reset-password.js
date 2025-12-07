import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const email = 'info@buffetdelagarechezclaude.ch';
    const newPassword = 'Buffet2024!'; // Mot de passe temporaire

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ Utilisateur ${email} non trouvé`);
      process.exit(1);
    }

    console.log(`\n👤 Utilisateur trouvé: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   Sites: ${user.sites.length}`);

    // Changer le mot de passe
    user.password = newPassword;
    await user.save();

    console.log(`\n✅ Mot de passe réinitialisé avec succès !`);
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
    console.log(`\n⚠️  IMPORTANT: Demande à l'utilisateur de changer ce mot de passe après la première connexion`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

resetPassword();
