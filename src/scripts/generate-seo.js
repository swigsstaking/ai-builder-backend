import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import Site from '../models/Site.js';
import SEO from '../models/SEO.js';

/**
 * Génère les fichiers SEO statiques depuis la base de données
 * Pour chaque site, crée un fichier JSON avec toutes les données SEO
 */
const generateSEO = async () => {
  try {
    // Vérifier si déjà connecté
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 Connexion à MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms', {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ Connecté à MongoDB');
    } else {
      console.log('✅ Utilisation connexion MongoDB existante');
    }

    // Récupérer tous les sites actifs
    const sites = await Site.find({ isActive: true });
    console.log(`📊 ${sites.length} site(s) actif(s) trouvé(s)`);

    for (const site of sites) {
      console.log(`\n🏢 Traitement du site: ${site.name} (${site.slug})`);

      // Récupérer tous les SEO du site
      const seoEntries = await SEO.find({ site: site._id });
      console.log(`   📝 ${seoEntries.length} entrée(s) SEO trouvée(s)`);

      // Construire l'objet SEO
      const seoData = {
        site: {
          name: site.name,
          slug: site.slug,
          domain: site.domain,
          description: site.description,
        },
        pages: {},
        global: {
          siteName: site.name,
          siteUrl: `https://${site.domain}`,
          logo: site.logo?.url || null,
          favicon: site.favicon || null,
          language: site.settings?.language || 'fr',
          social: site.social || {},
        },
        generatedAt: new Date().toISOString(),
      };

      // Organiser les SEO par page
      seoEntries.forEach((seo) => {
        seoData.pages[seo.page] = {
          title: seo.title,
          description: seo.description,
          keywords: seo.keywords,
          ogTitle: seo.ogTitle || seo.title,
          ogDescription: seo.ogDescription || seo.description,
          ogImage: seo.ogImage || site.logo?.url || null,
          twitterCard: seo.twitterCard || 'summary_large_image',
          canonical: seo.canonical || null,
          robots: seo.robots || 'index,follow',
        };
      });

      // Déterminer le chemin de sortie selon le site
      let outputDir;
      if (site.slug === 'speed-l') {
        // Site principal
        outputDir = path.join(__dirname, '../../../src/data');
      } else {
        // Autres sites (futurs)
        outputDir = path.join(__dirname, `../../../sites/${site.slug}/src/data`);
      }

      // Créer le dossier si nécessaire
      await fs.mkdir(outputDir, { recursive: true });

      // Écrire le fichier JSON
      const outputPath = path.join(outputDir, 'seo.json');
      await fs.writeFile(outputPath, JSON.stringify(seoData, null, 2), 'utf-8');

      console.log(`   ✅ Fichier généré: ${outputPath}`);
      console.log(`   📦 ${Object.keys(seoData.pages).length} page(s) configurée(s)`);
    }

    console.log('\n✅ Génération SEO terminée avec succès !');
    
    // Retourner les sites traités pour le git commit
    return sites.map(s => s.slug);

  } catch (error) {
    console.error('❌ Erreur lors de la génération SEO:', error);
    throw error;
  }
  // Note: Ne pas fermer la connexion MongoDB ici car elle est partagée avec le serveur
};

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSEO()
    .then((sites) => {
      console.log(`\n🎉 Sites traités: ${sites.join(', ')}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

export default generateSEO;
