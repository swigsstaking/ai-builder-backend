import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';
import SEO from '../models/SEO.js';

dotenv.config();

/**
 * Créer le SEO complet pour Buffet de la Gare
 */
const setupBuffetSEO = async () => {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB\n');

    // Trouver le site Buffet
    const buffet = await Site.findOne({ slug: 'buffet' });
    if (!buffet) {
      console.error('❌ Site Buffet non trouvé');
      process.exit(1);
    }

    console.log(`🏢 Configuration SEO pour: ${buffet.name}\n`);

    // SEO Pages
    const seoPages = [
      {
        page: 'home',
        title: 'Buffet de la Gare - Restaurant à Sion | Cuisine du Terroir',
        description: 'Restaurant traditionnel à Sion. Découvrez notre cuisine du terroir, nos plats faits maison et notre ambiance chaleureuse. Réservation en ligne.',
        keywords: ['restaurant sion', 'buffet de la gare', 'cuisine terroir', 'restaurant valais', 'plats maison'],
        ogTitle: 'Buffet de la Gare - Restaurant à Sion',
        ogDescription: 'Restaurant traditionnel à Sion. Cuisine du terroir et plats faits maison.',
        ogImage: buffet.logo?.url || null,
        robots: 'index,follow',
      },
      {
        page: 'carte',
        title: 'Notre Carte - Buffet de la Gare | Plats du Terroir',
        description: 'Découvrez notre carte de saison : entrées, plats principaux, fromages et desserts. Cuisine traditionnelle valaisanne et spécialités maison.',
        keywords: ['carte restaurant', 'menu sion', 'plats valaisans', 'cuisine terroir', 'spécialités maison'],
        ogTitle: 'Notre Carte - Buffet de la Gare',
        ogDescription: 'Découvrez notre carte de saison et nos spécialités du terroir.',
        ogImage: buffet.logo?.url || null,
        robots: 'index,follow',
      },
      {
        page: 'evenements',
        title: 'Événements - Buffet de la Gare | Soirées & Animations',
        description: 'Découvrez nos événements à venir : soirées à thème, concerts, dégustations et animations. Réservez votre place pour une expérience unique.',
        keywords: ['événements sion', 'soirées restaurant', 'animations valais', 'concerts restaurant', 'soirées thème'],
        ogTitle: 'Événements - Buffet de la Gare',
        ogDescription: 'Soirées à thème, concerts et animations. Réservez votre place !',
        ogImage: buffet.logo?.url || null,
        robots: 'index,follow',
      },
      {
        page: 'contact',
        title: 'Contact & Réservation - Buffet de la Gare | Sion',
        description: 'Contactez-nous pour réserver votre table ou organiser un événement. Buffet de la Gare, Sion. Téléphone, email et formulaire de contact.',
        keywords: ['réservation restaurant sion', 'contact buffet gare', 'réserver table', 'restaurant sion contact'],
        ogTitle: 'Contact & Réservation - Buffet de la Gare',
        ogDescription: 'Réservez votre table ou contactez-nous pour plus d\'informations.',
        ogImage: buffet.logo?.url || null,
        robots: 'index,follow',
      },
    ];

    // Créer ou mettre à jour chaque SEO
    for (const seoData of seoPages) {
      const existing = await SEO.findOne({ site: buffet._id, page: seoData.page });
      
      if (existing) {
        Object.assign(existing, seoData);
        await existing.save();
        console.log(`✅ SEO mis à jour: ${seoData.page}`);
      } else {
        await SEO.create({
          site: buffet._id,
          ...seoData,
        });
        console.log(`✅ SEO créé: ${seoData.page}`);
      }
    }

    console.log('\n✅ SEO Buffet de la Gare configuré avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

setupBuffetSEO();
