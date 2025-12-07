import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Site from '../src/models/Site.js';
import SEO from '../src/models/SEO.js';

dotenv.config();

const initMoontainSEO = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Trouver le site Moontain Digital
    const site = await Site.findOne({ slug: 'moontain-digital' });
    if (!site) {
      console.error('❌ Site moontain-digital not found');
      process.exit(1);
    }

    console.log(`✅ Found site: ${site.name}`);

    // Définir les pages SEO
    const seoPages = [
      {
        site: site._id,
        page: 'home',
        title: 'Moontain Digital | Agence Web Suisse',
        description: 'Création et refonte de sites web en Suisse. Hébergement local sécurisé, design moderne responsive, optimisation SEO et accompagnement sur-mesure. Devis gratuit.',
        keywords: ['agence web suisse', 'création site web', 'refonte site internet', 'hébergement suisse', 'design responsive', 'site performant', 'agence digitale suisse', 'développement web', 'SEO suisse'],
        ogTitle: 'Moontain Digital - Votre Agence Web en Suisse',
        ogDescription: 'Sites performants • Hébergement local • Design moderne • Accompagnement personnalisé',
        ogImage: 'https://moontain-digital.ch/og-image.jpg',
        canonical: 'https://moontain-digital.ch',
      },
      {
        site: site._id,
        page: 'atouts',
        title: 'Nos Atouts | Moontain Digital',
        description: 'Hébergement en Suisse, design moderne, gestion des réseaux sociaux, maintenance et sécurité. Découvrez ce qui nous différencie.',
        keywords: ['hébergement suisse', 'design moderne', 'performance web', 'sécurité web', 'réseaux sociaux'],
        ogTitle: 'Nos Atouts - Moontain Digital',
        ogDescription: 'Pourquoi choisir Moontain Digital pour votre projet web',
        canonical: 'https://moontain-digital.ch/atouts',
      },
      {
        site: site._id,
        page: 'realisations',
        title: 'Nos Réalisations | Moontain Digital',
        description: 'Découvrez nos projets de création et refonte de sites web : auto-écoles, restaurants, e-commerce. Résultats mesurables et performance optimale.',
        keywords: ['portfolio web', 'réalisations suisse', 'projets web', 'case studies'],
        ogTitle: 'Nos Réalisations - Moontain Digital',
        ogDescription: 'Projets avec résultats mesurables',
        canonical: 'https://moontain-digital.ch/realisations',
      },
      {
        site: site._id,
        page: 'methode',
        title: 'Notre Méthode | Moontain Digital',
        description: 'Notre approche en 6 étapes pour un projet web réussi : audit, design, développement, optimisation, mise en ligne et suivi continu.',
        keywords: ['méthode agile', 'processus web', 'création site web'],
        ogTitle: 'Notre Méthode - Moontain Digital',
        ogDescription: '6 étapes pour un projet web réussi',
        canonical: 'https://moontain-digital.ch/methode',
      },
      {
        site: site._id,
        page: 'tarifs',
        title: 'Tarifs | Moontain Digital',
        description: 'Forfaits de création de sites web : Essentiel, Pro, Elite. Hébergement en Suisse inclus, SSL, sauvegardes et monitoring.',
        keywords: ['tarifs site web', 'prix création site', 'forfaits web suisse'],
        ogTitle: 'Tarifs - Moontain Digital',
        ogDescription: 'Forfaits adaptés à vos besoins',
        canonical: 'https://moontain-digital.ch/tarifs',
      },
      {
        site: site._id,
        page: 'faq',
        title: 'FAQ | Moontain Digital',
        description: 'Questions fréquentes sur la création de sites web : délais, domaine, SEO, fonctionnalités, maintenance et hébergement.',
        keywords: ['faq site web', 'questions création site', 'aide'],
        ogTitle: 'FAQ - Moontain Digital',
        ogDescription: 'Réponses à vos questions',
        canonical: 'https://moontain-digital.ch/faq',
      },
      {
        site: site._id,
        page: 'contact',
        title: 'Contact | Moontain Digital',
        description: 'Contactez Moontain Digital pour votre projet web. Devis gratuit, réponse rapide. Basés en Suisse, nous accompagnons TPE et PME dans leur transformation digitale.',
        keywords: ['contact agence web', 'devis site web', 'agence suisse contact'],
        ogTitle: 'Contactez Moontain Digital',
        ogDescription: 'Parlons de votre projet web ensemble',
        canonical: 'https://moontain-digital.ch/contact',
      },
    ];

    // Créer ou mettre à jour chaque page SEO
    for (const seoData of seoPages) {
      const existing = await SEO.findOne({ site: site._id, page: seoData.page });
      
      if (existing) {
        Object.assign(existing, seoData);
        await existing.save();
        console.log(`✅ Updated SEO for page: ${seoData.page}`);
      } else {
        await SEO.create(seoData);
        console.log(`✅ Created SEO for page: ${seoData.page}`);
      }
    }

    console.log('\n🎉 SEO initialization completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

initMoontainSEO();
