import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Media from '../models/Media.js';

dotenv.config();

/**
 * Script pour corriger les URLs médias qui ont double https://
 * Usage: node src/scripts/fix-media-urls.js
 */

const fixMediaUrls = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB');

    // Trouver tous les médias avec URLs incorrectes
    const medias = await Media.find({
      url: { $regex: /^https:\/\/https:\/\// }
    });

    console.log(`\n📋 ${medias.length} médias trouvés avec URLs incorrectes\n`);

    if (medias.length === 0) {
      console.log('✅ Aucune correction nécessaire !');
      process.exit(0);
    }

    // Corriger chaque média
    for (const media of medias) {
      const oldUrl = media.url;
      // Supprimer le premier https://
      const newUrl = media.url.replace(/^https:\/\/https:\/\//, 'https://');
      
      media.url = newUrl;
      await media.save();
      
      console.log(`✅ Corrigé: ${media.filename}`);
      console.log(`   Avant: ${oldUrl}`);
      console.log(`   Après: ${newUrl}\n`);
    }

    console.log(`\n🎉 ${medias.length} URLs corrigées avec succès !`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

fixMediaUrls();
