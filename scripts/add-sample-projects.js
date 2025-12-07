import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../src/models/Site.js';
import Content from '../src/models/Content.js';

dotenv.config();

const addSampleProjects = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const site = await Site.findOne({ slug: 'moontain-digital' });
    
    if (!site) {
      console.log('❌ Site moontain-digital not found');
      process.exit(1);
    }

    console.log('📝 Adding sample projects...');

    // Vérifier si des projets existent déjà
    const existingContent = await Content.findOne({
      site: site._id,
      type: 'projects',
      section: 'projects',
    });

    const sampleProjects = [
      {
        id: '1',
        title: 'Auto-École Speed-L',
        subtitle: 'Auto-école',
        description: 'Moderniser le site et faciliter les inscriptions en ligne',
        image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80',
        url: 'https://www.speed-l.ch/',
        category: 'web',
        enableSlider: false,
        improvements: [
          'Refonte complète du design',
          'Système de réservation en ligne',
          'Optimisation mobile-first',
          'Intégration Google Maps',
        ],
        results: [
          { label: 'Inscriptions en ligne', value: '+62%' },
          { label: 'Temps de chargement', value: '-58%' },
          { label: 'Taux de conversion', value: '+45%' },
        ],
        tags: ['react', 'responsive', 'booking'],
        order: 1,
      },
      {
        id: '2',
        title: 'Buffet de la Gare chez Claude',
        subtitle: 'Restaurant',
        description: 'Créer une présence en ligne moderne et appétissante',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
        url: 'https://buffetdelagarechezclaude.ch/',
        category: 'web',
        enableSlider: false,
        improvements: [
          'Design chaleureux et authentique',
          'Menu dynamique et événements',
          'Galerie photos professionnelle',
          'Formulaire de réservation',
        ],
        results: [
          { label: 'Réservations en ligne', value: '+78%' },
          { label: 'LCP (Largest Contentful Paint)', value: '-45%' },
          { label: 'Visites mensuelles', value: '+120%' },
        ],
        tags: ['restaurant', 'menu', 'events'],
        order: 2,
      },
    ];

    if (existingContent) {
      // Mettre à jour le contenu existant
      existingContent.data = sampleProjects;
      await existingContent.save();
      console.log('✅ Projects updated successfully!');
    } else {
      // Créer un nouveau document Content
      await Content.create({
        site: site._id,
        type: 'projects',
        section: 'projects',
        data: sampleProjects,
      });
      console.log('✅ Projects created successfully!');
    }

    console.log(`📊 Total projects: ${sampleProjects.length}`);
    sampleProjects.forEach(p => console.log(`   - ${p.title}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addSampleProjects();
