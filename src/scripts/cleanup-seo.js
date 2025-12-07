import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';
import SEO from '../models/SEO.js';

dotenv.config();

/**
 * Nettoyer les SEO qui n'ont pas de page correspondante
 */
const cleanupSEO = async () => {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB\n');

    const sites = await Site.find({});
    
    for (const site of sites) {
      console.log(`\n🏢 Nettoyage ${site.name}...`);
      
      // Récupérer tous les SEO du site
      const seos = await SEO.find({ site: site._id });
      
      // Pages valides du site
      const validPages = site.pages?.map(p => p.value) || [];
      console.log(`   Pages valides: ${validPages.join(', ')}`);
      
      // Supprimer les SEO invalides
      for (const seo of seos) {
        if (!validPages.includes(seo.page)) {
          console.log(`   ❌ Suppression SEO: ${seo.page} (page inexistante)`);
          await SEO.deleteOne({ _id: seo._id });
        } else {
          console.log(`   ✅ SEO OK: ${seo.page}`);
        }
      }
    }

    console.log('\n✅ Nettoyage terminé !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

cleanupSEO();
