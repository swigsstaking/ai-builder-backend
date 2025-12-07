import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';

dotenv.config();

/**
 * Migration pour ajouter le champ domains aux sites existants
 */
const migrateDomains = async () => {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB');

    const sites = await Site.find({});
    console.log(`📊 ${sites.length} site(s) trouvé(s)`);

    for (const site of sites) {
      // Si le site n'a pas encore de domaines multiples
      if (!site.domains || site.domains.length === 0) {
        console.log(`\n🏢 Migration du site: ${site.name}`);
        
        // Créer les domaines basés sur le domaine principal
        const newDomains = [];
        
        // Domaine de test (sous-domaine swigs.online)
        newDomains.push({
          url: `${site.slug}.swigs.online`,
          environment: 'test',
          isPrimary: false,
        });
        
        // Domaine de production (si différent)
        if (site.domain && site.domain !== `${site.slug}.swigs.online`) {
          newDomains.push({
            url: site.domain,
            environment: 'production',
            isPrimary: true,
          });
        }
        
        site.domains = newDomains;
        await site.save();
        
        console.log(`   ✅ Domaines ajoutés:`);
        newDomains.forEach(d => {
          console.log(`      - ${d.url} (${d.environment})${d.isPrimary ? ' [PRIMARY]' : ''}`);
        });
      } else {
        console.log(`\n⏭️  Site ${site.name} déjà migré`);
      }
    }

    console.log('\n✅ Migration terminée avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
};

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDomains();
}

export default migrateDomains;
