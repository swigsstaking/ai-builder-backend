import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';
import SEO from '../models/SEO.js';

dotenv.config();

const createAllSEO = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB\n');

    // Speed-L - TOUTES LES PAGES
    const speedL = await Site.findOne({ slug: 'speed-l' });
    if (speedL) {
      console.log('🏢 Speed-L Auto-école');
      
      // Mettre à jour les pages
      speedL.pages = [
        { value: 'home', label: 'Accueil' },
        { value: 'cours', label: 'Cours & Inscriptions' },
        { value: 'permis', label: 'Permis' },
        { value: 'bons-cadeaux', label: 'Bons Cadeaux' },
        { value: 'contact', label: 'Contact' },
      ];
      await speedL.save();
      
      const seoPages = [
        {
          page: 'home',
          title: 'Speed-L Auto-école à Sion | Valais',
          description: 'Votre école de conduite à Sion depuis près de 30 ans. Cours de sensibilisation, permis voiture, moto et scooter. Qualité et professionnalisme.',
          keywords: ['auto-école sion', 'permis conduire valais', 'cours conduite', 'speed-l'],
          ogTitle: 'Speed-L Auto-école à Sion',
          ogDescription: 'École de conduite à Sion - Permis voiture, moto, scooter',
          robots: 'index,follow',
        },
        {
          page: 'cours',
          title: 'Cours & Inscriptions - Speed-L Auto-école | Sion',
          description: 'Découvrez nos cours de conduite : permis voiture, moto, scooter. Inscrivez-vous en ligne. Cours théoriques et pratiques adaptés à votre niveau.',
          keywords: ['cours conduite sion', 'inscription permis', 'leçons conduite', 'auto-école valais'],
          ogTitle: 'Cours & Inscriptions - Speed-L',
          ogDescription: 'Inscrivez-vous à nos cours de conduite à Sion',
          robots: 'index,follow',
        },
        {
          page: 'permis',
          title: 'Permis de Conduire - Speed-L Auto-école | Sion',
          description: 'Tous les types de permis : voiture (B), moto (A), scooter, camion. Formation complète avec moniteurs expérimentés. Taux de réussite élevé.',
          keywords: ['permis conduire sion', 'permis voiture', 'permis moto', 'permis scooter'],
          ogTitle: 'Permis de Conduire - Speed-L',
          ogDescription: 'Obtenez votre permis avec Speed-L à Sion',
          robots: 'index,follow',
        },
        {
          page: 'bons-cadeaux',
          title: 'Bons Cadeaux - Speed-L Auto-école | Sion',
          description: 'Offrez des cours de conduite ! Bons cadeaux disponibles pour leçons de conduite, cours théoriques. Le cadeau idéal pour un proche.',
          keywords: ['bon cadeau conduite', 'offrir cours conduite', 'cadeau permis', 'speed-l sion'],
          ogTitle: 'Bons Cadeaux - Speed-L',
          ogDescription: 'Offrez des cours de conduite à Sion',
          robots: 'index,follow',
        },
        {
          page: 'contact',
          title: 'Contact - Speed-L Auto-école | Sion',
          description: 'Contactez Speed-L à Sion. Téléphone, email, formulaire de contact. Nous répondons à toutes vos questions sur nos cours de conduite.',
          keywords: ['contact speed-l', 'auto-école sion contact', 'téléphone speed-l'],
          ogTitle: 'Contact - Speed-L',
          ogDescription: 'Contactez-nous pour plus d\'informations',
          robots: 'index,follow',
        },
      ];

      for (const seoData of seoPages) {
        const existing = await SEO.findOne({ site: speedL._id, page: seoData.page });
        if (existing) {
          Object.assign(existing, seoData);
          await existing.save();
          console.log(`   ✅ ${seoData.page} (mis à jour)`);
        } else {
          await SEO.create({ site: speedL._id, ...seoData });
          console.log(`   ✅ ${seoData.page} (créé)`);
        }
      }
    }

    // Buffet - TOUTES LES PAGES
    const buffet = await Site.findOne({ slug: 'buffet' });
    if (buffet) {
      console.log('\n🏢 Buffet de la Gare');
      
      // Mettre à jour les pages
      buffet.pages = [
        { value: 'home', label: 'Accueil' },
        { value: 'presentation', label: 'Présentation' },
        { value: 'carte', label: 'Notre Carte' },
        { value: 'galerie', label: 'Galerie' },
        { value: 'evenements', label: 'Événements' },
        { value: 'contact', label: 'Contact' },
      ];
      await buffet.save();
      
      const seoPages = [
        {
          page: 'home',
          title: 'Buffet de la Gare - Restaurant à Sion | Cuisine du Terroir',
          description: 'Restaurant traditionnel à Sion. Découvrez notre cuisine du terroir, nos plats faits maison et notre ambiance chaleureuse. Réservation en ligne.',
          keywords: ['restaurant sion', 'buffet de la gare', 'cuisine terroir', 'restaurant valais', 'plats maison'],
          ogTitle: 'Buffet de la Gare - Restaurant à Sion',
          ogDescription: 'Restaurant traditionnel à Sion. Cuisine du terroir et plats faits maison.',
          robots: 'index,follow',
        },
        {
          page: 'presentation',
          title: 'Présentation - Buffet de la Gare | Notre Histoire',
          description: 'Découvrez l\'histoire du Buffet de la Gare à Sion. Restaurant familial depuis plusieurs générations, nous perpétuons la tradition de la cuisine valaisanne.',
          keywords: ['restaurant sion histoire', 'buffet gare présentation', 'restaurant familial valais'],
          ogTitle: 'Présentation - Buffet de la Gare',
          ogDescription: 'Notre histoire et nos valeurs',
          robots: 'index,follow',
        },
        {
          page: 'carte',
          title: 'Notre Carte - Buffet de la Gare | Plats du Terroir',
          description: 'Découvrez notre carte de saison : entrées, plats principaux, fromages et desserts. Cuisine traditionnelle valaisanne et spécialités maison.',
          keywords: ['carte restaurant', 'menu sion', 'plats valaisans', 'cuisine terroir', 'spécialités maison'],
          ogTitle: 'Notre Carte - Buffet de la Gare',
          ogDescription: 'Découvrez notre carte de saison et nos spécialités du terroir.',
          robots: 'index,follow',
        },
        {
          page: 'galerie',
          title: 'Galerie Photos - Buffet de la Gare | Sion',
          description: 'Découvrez en images notre restaurant, nos plats et notre ambiance. Photos du Buffet de la Gare à Sion.',
          keywords: ['photos restaurant sion', 'galerie buffet gare', 'images restaurant valais'],
          ogTitle: 'Galerie Photos - Buffet de la Gare',
          ogDescription: 'Découvrez notre restaurant en images',
          robots: 'index,follow',
        },
        {
          page: 'evenements',
          title: 'Événements - Buffet de la Gare | Soirées & Animations',
          description: 'Découvrez nos événements à venir : soirées à thème, concerts, dégustations et animations. Réservez votre place pour une expérience unique.',
          keywords: ['événements sion', 'soirées restaurant', 'animations valais', 'concerts restaurant', 'soirées thème'],
          ogTitle: 'Événements - Buffet de la Gare',
          ogDescription: 'Soirées à thème, concerts et animations. Réservez votre place !',
          robots: 'index,follow',
        },
        {
          page: 'contact',
          title: 'Contact & Réservation - Buffet de la Gare | Sion',
          description: 'Contactez-nous pour réserver votre table ou organiser un événement. Buffet de la Gare, Sion. Téléphone, email et formulaire de contact.',
          keywords: ['réservation restaurant sion', 'contact buffet gare', 'réserver table', 'restaurant sion contact'],
          ogTitle: 'Contact & Réservation - Buffet de la Gare',
          ogDescription: 'Réservez votre table ou contactez-nous pour plus d\'informations.',
          robots: 'index,follow',
        },
      ];

      for (const seoData of seoPages) {
        const existing = await SEO.findOne({ site: buffet._id, page: seoData.page });
        if (existing) {
          Object.assign(existing, seoData);
          await existing.save();
          console.log(`   ✅ ${seoData.page} (mis à jour)`);
        } else {
          await SEO.create({ site: buffet._id, ...seoData });
          console.log(`   ✅ ${seoData.page} (créé)`);
        }
      }
    }

    console.log('\n✅ TERMINÉ !');
    console.log(`   Speed-L: 5 pages SEO`);
    console.log(`   Buffet: 6 pages SEO`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

createAllSEO();
