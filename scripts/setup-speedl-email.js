import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../src/models/Site.js';

dotenv.config();

const setupSpeedLEmail = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const site = await Site.findOne({ slug: 'speed-l' });
    
    if (!site) {
      console.log('❌ Site Speed-L non trouvé');
      process.exit(1);
    }

    console.log('\n📧 Configuration email actuelle:');
    console.log('Email formulaires:', site.contact?.formsEmail || 'NON CONFIGURÉ');
    console.log('Email général:', site.contact?.email || 'NON CONFIGURÉ');
    console.log('Téléphone:', site.contact?.phone || 'NON CONFIGURÉ');

    // Si pas d'email configuré, proposer de le configurer
    if (!site.contact?.formsEmail) {
      console.log('\n⚠️  Email de réception des formulaires NON CONFIGURÉ');
      console.log('Pour configurer, modifiez le site dans l\'admin ou exécutez:');
      console.log('Site.findOneAndUpdate({ slug: "speed-l" }, { "contact.formsEmail": "votre@email.ch" })');
    } else {
      console.log('\n✅ Email configuré, les formulaires seront envoyés à:', site.contact.formsEmail);
    }

    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

setupSpeedLEmail();
