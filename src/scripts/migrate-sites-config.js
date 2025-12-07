import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';

dotenv.config();

/**
 * Migration: Ajouter configuration dynamique aux sites existants
 */
const migrateSitesConfig = async () => {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB\n');

    // Récupérer tous les sites
    const sites = await Site.find({});
    console.log(`📊 ${sites.length} site(s) trouvé(s)\n`);

    for (const site of sites) {
      console.log(`\n🏢 Migration du site: ${site.name} (${site.slug})`);

      // Déterminer la config selon le slug
      let siteType = 'custom';
      let primaryType = 'custom';
      let enabledModules = [];
      let deployment = {};

      if (site.slug === 'speed-l') {
        siteType = 'auto-ecole';
        primaryType = 'courses';
        enabledModules = ['courses'];
        deployment = {
          repository: '/home/swigs/websites/speed-l',
          branch: 'main',
          buildCommand: 'npm run build',
          outputDir: 'dist',
          deployPath: '/var/www/speed-l',
          framework: 'react',
        };
      } else if (site.slug === 'buffet' || site.slug === 'buffet-de-la-gare') {
        siteType = 'restaurant';
        primaryType = 'menu';
        enabledModules = ['menu', 'events'];
        deployment = {
          repository: '/home/swigs/websites/buffet-de-la-gare-website',
          branch: 'main',
          buildCommand: 'npm run build',
          outputDir: 'dist',
          deployPath: '/var/www/buffet-de-la-gare',
          framework: 'react',
        };
      }

      // Mettre à jour le site
      site.siteType = siteType;
      site.contentConfig = {
        primaryType,
        enabledModules,
      };
      site.deployment = deployment;
      site.apiConfig = {
        baseUrl: `https://${site.domain}`,
        serviceToken: '', // À générer si nécessaire
      };

      await site.save();
      console.log(`   ✅ Migré: ${siteType} | ${primaryType} | modules: ${enabledModules.join(', ')}`);
    }

    console.log('\n✅ Migration terminée avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
};

// Exécuter la migration
migrateSitesConfig();
