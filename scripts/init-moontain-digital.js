import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../src/models/Site.js';

dotenv.config();

const initMoontainDigital = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const site = await Site.findOne({ slug: 'moontain-digital' });
    
    if (!site) {
      console.log('❌ Site moontain-digital not found');
      process.exit(1);
    }

    console.log('📝 Updating Moontain Digital site...');

    // Mettre à jour le site avec les bonnes pages et config
    site.pages = [
      { value: 'home', label: 'Accueil' },
      { value: 'atouts', label: 'Nos Atouts' },
      { value: 'realisations', label: 'Nos Réalisations' },
      { value: 'methode', label: 'Notre Méthode' },
      { value: 'tarifs', label: 'Tarifs' },
      { value: 'faq', label: 'FAQ' },
      { value: 'contact', label: 'Contact' },
    ];

    site.contentConfig = {
      primaryType: 'projects',
      enabledModules: ['projects'],
    };

    await site.save();

    console.log('✅ Site updated successfully!');
    console.log('Pages:', site.pages.map(p => p.name).join(', '));
    console.log('Primary Type:', site.contentConfig.primaryType);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

initMoontainDigital();
