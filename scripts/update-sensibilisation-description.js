import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../src/models/Course.js';
import Site from '../src/models/Site.js';

dotenv.config();

const updateDescription = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer le site Speed-L
    const site = await Site.findOne({ slug: 'speed-l' });
    if (!site) {
      console.log('❌ Site Speed-L non trouvé');
      process.exit(1);
    }

    // Nouvelle description
    const newDescription = 'Cours obligatoire pour tous les nouveaux conducteurs. Sensibilisation aux problèmes du trafic routier.';

    // Mettre à jour tous les cours de sensibilisation pour Speed-L
    const result = await Course.updateMany(
      { 
        site: site._id,
        category: 'Sensibilisation'
      },
      { 
        $set: { description: newDescription }
      }
    );

    console.log('\n📝 Mise à jour effectuée:');
    console.log('Cours modifiés:', result.modifiedCount);
    console.log('Nouvelle description:', newDescription);

    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

updateDescription();
