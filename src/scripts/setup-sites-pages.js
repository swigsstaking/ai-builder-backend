import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';

dotenv.config();

/**
 * Configuration des pages pour chaque site
 */
const setupSitesPages = async () => {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB\n');

    // Configuration Speed-L
    const speedL = await Site.findOne({ slug: 'speed-l' });
    if (speedL) {
      console.log('🏢 Configuration Speed-L...');
      speedL.pages = [
        { value: 'home', label: 'Accueil' },
        { value: 'cours', label: 'Cours & Inscriptions' },
        { value: 'permis', label: 'Permis' },
        { value: 'bons-cadeaux', label: 'Bons Cadeaux' },
        { value: 'contact', label: 'Contact' },
      ];
      speedL.sections = [
        { value: 'hero', label: 'Hero' },
        { value: 'courses', label: 'Cours' },
        { value: 'testimonials', label: 'Témoignages' },
      ];
      await speedL.save();
      console.log('✅ Speed-L configuré (5 pages)');
    }

    // Configuration Buffet de la Gare
    const buffet = await Site.findOne({ slug: 'buffet' });
    if (buffet) {
      console.log('\n🏢 Configuration Buffet de la Gare...');
      buffet.pages = [
        { value: 'home', label: 'Accueil' },
        { value: 'carte', label: 'Notre Carte' },
        { value: 'evenements', label: 'Événements' },
        { value: 'contact', label: 'Contact' },
      ];
      buffet.sections = [
        { value: 'hero', label: 'Hero' },
        { value: 'menu', label: 'Menu' },
        { value: 'events', label: 'Événements' },
        { value: 'testimonials', label: 'Témoignages' },
      ];
      await buffet.save();
      console.log('✅ Buffet de la Gare configuré');
    }

    console.log('\n✅ Configuration terminée avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

setupSitesPages();
