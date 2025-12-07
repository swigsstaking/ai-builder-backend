import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';
import SEO from '../models/SEO.js';
import Content from '../models/Content.js';

dotenv.config();

const fixEverything = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB\n');

    console.log('═══════════════════════════════════════');
    console.log('FIX 1/4 : PAGES SITES');
    console.log('═══════════════════════════════════════\n');

    // Speed-L
    const speedL = await Site.findOne({ slug: 'speed-l' });
    if (speedL) {
      speedL.pages = [
        { value: 'home', label: 'Accueil' },
        { value: 'cours', label: 'Cours & Inscriptions' },
        { value: 'permis', label: 'Permis' },
        { value: 'bons-cadeaux', label: 'Bons Cadeaux' },
        { value: 'contact', label: 'Contact' },
      ];
      await speedL.save();
      console.log('✅ Speed-L: 5 pages configurées');
    }

    // Buffet
    const buffet = await Site.findOne({ slug: 'buffet' });
    if (buffet) {
      buffet.pages = [
        { value: 'home', label: 'Accueil' },
        { value: 'presentation', label: 'Présentation' },
        { value: 'carte', label: 'Notre Carte' },
        { value: 'galerie', label: 'Galerie' },
        { value: 'evenements', label: 'Événements' },
        { value: 'contact', label: 'Contact' },
      ];
      await buffet.save();
      console.log('✅ Buffet: 6 pages configurées');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('FIX 2/4 : SEO');
    console.log('═══════════════════════════════════════\n');

    // SEO Speed-L
    if (speedL) {
      const speedLSeo = [
        { page: 'home', title: 'Speed-L Auto-école à Sion | Valais', description: 'Votre école de conduite à Sion depuis près de 30 ans. Cours de sensibilisation, permis voiture, moto et scooter. Qualité et professionnalisme.' },
        { page: 'cours', title: 'Cours & Inscriptions - Speed-L Auto-école | Sion', description: 'Découvrez nos cours de conduite : permis voiture, moto, scooter. Inscrivez-vous en ligne. Cours théoriques et pratiques adaptés à votre niveau.' },
        { page: 'permis', title: 'Permis de Conduire - Speed-L Auto-école | Sion', description: 'Tous les types de permis : voiture (B), moto (A), scooter, camion. Formation complète avec moniteurs expérimentés. Taux de réussite élevé.' },
        { page: 'bons-cadeaux', title: 'Bons Cadeaux - Speed-L Auto-école | Sion', description: 'Offrez des cours de conduite ! Bons cadeaux disponibles pour leçons de conduite, cours théoriques. Le cadeau idéal pour un proche.' },
        { page: 'contact', title: 'Contact - Speed-L Auto-école | Sion', description: 'Contactez Speed-L à Sion. Téléphone, email, formulaire de contact. Nous répondons à toutes vos questions sur nos cours de conduite.' },
      ];

      for (const seo of speedLSeo) {
        await SEO.findOneAndUpdate(
          { site: speedL._id, page: seo.page },
          { 
            site: speedL._id,
            ...seo,
            keywords: ['auto-école sion', 'permis conduire valais'],
            robots: 'index,follow'
          },
          { upsert: true, new: true }
        );
      }
      console.log('✅ Speed-L: 5 SEO créés/mis à jour');
    }

    // SEO Buffet
    if (buffet) {
      const buffetSeo = [
        { page: 'home', title: 'Buffet de la Gare - Restaurant à Sion | Cuisine du Terroir', description: 'Restaurant traditionnel à Sion. Découvrez notre cuisine du terroir, nos plats faits maison et notre ambiance chaleureuse. Réservation en ligne.' },
        { page: 'presentation', title: 'Présentation - Buffet de la Gare | Notre Histoire', description: 'Découvrez l\'histoire du Buffet de la Gare à Sion. Restaurant familial depuis plusieurs générations, nous perpétuons la tradition de la cuisine valaisanne.' },
        { page: 'carte', title: 'Notre Carte - Buffet de la Gare | Plats du Terroir', description: 'Découvrez notre carte de saison : entrées, plats principaux, fromages et desserts. Cuisine traditionnelle valaisanne et spécialités maison.' },
        { page: 'galerie', title: 'Galerie Photos - Buffet de la Gare | Sion', description: 'Découvrez en images notre restaurant, nos plats et notre ambiance. Photos du Buffet de la Gare à Sion.' },
        { page: 'evenements', title: 'Événements - Buffet de la Gare | Soirées & Animations', description: 'Découvrez nos événements à venir : soirées à thème, concerts, dégustations et animations. Réservez votre place pour une expérience unique.' },
        { page: 'contact', title: 'Contact & Réservation - Buffet de la Gare | Sion', description: 'Contactez-nous pour réserver votre table ou organiser un événement. Buffet de la Gare, Sion. Téléphone, email et formulaire de contact.' },
      ];

      for (const seo of buffetSeo) {
        await SEO.findOneAndUpdate(
          { site: buffet._id, page: seo.page },
          { 
            site: buffet._id,
            ...seo,
            keywords: ['restaurant sion', 'cuisine terroir', 'buffet gare'],
            robots: 'index,follow'
          },
          { upsert: true, new: true }
        );
      }
      console.log('✅ Buffet: 6 SEO créés/mis à jour');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('FIX 3/4 : MENU BUFFET');
    console.log('═══════════════════════════════════════\n');

    if (buffet) {
      // Vérifier si le menu existe
      let menuContent = await Content.findOne({ site: buffet._id, type: 'menu' });
      
      if (!menuContent) {
        // Créer le menu
        menuContent = await Content.create({
          site: buffet._id,
          section: 'menu',
          type: 'menu',
          data: {
            entrees: [],
            tartes: [],
            incontournables: [],
            formules: [],
            desserts: []
          },
          order: 0,
          isActive: true
        });
        console.log('✅ Menu créé');
      } else {
        // S'assurer que toutes les sections existent
        if (!menuContent.data) menuContent.data = {};
        if (!menuContent.data.entrees) menuContent.data.entrees = [];
        if (!menuContent.data.tartes) menuContent.data.tartes = [];
        if (!menuContent.data.incontournables) menuContent.data.incontournables = [];
        if (!menuContent.data.formules) menuContent.data.formules = [];
        if (!menuContent.data.desserts) menuContent.data.desserts = [];
        
        menuContent.markModified('data');
        await menuContent.save();
        console.log('✅ Menu vérifié (toutes sections présentes)');
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('FIX 4/4 : ÉVÉNEMENTS BUFFET');
    console.log('═══════════════════════════════════════\n');

    if (buffet) {
      const events = await Content.find({ site: buffet._id, section: 'events' });
      console.log(`✅ ${events.length} événement(s) trouvé(s)`);
      
      if (events.length === 0) {
        console.log('⚠️  Aucun événement. Créer un événement depuis l\'Admin.');
      } else {
        events.forEach(e => {
          console.log(`   - ${e.data?.title || 'Sans titre'} (${e.data?.date || 'Sans date'})`);
        });
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ TOUT EST CORRIGÉ !');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

fixEverything();
