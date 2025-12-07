import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';
import Content from '../models/Content.js';

dotenv.config();

/**
 * Préremplir le menu du Buffet de la Gare
 */
const setupBuffetMenu = async () => {
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

    console.log(`🏢 Configuration menu pour: ${buffet.name}\n`);

    // Menu complet
    const menuData = {
      entrees: [
        {
          id: '1',
          name: 'Mesclun de saison, vinaigrette du Chef',
          description: '',
          price: '7.-',
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'
        },
        {
          id: '2',
          name: 'Crème de courge chips de lard croustillantes',
          description: '',
          price: '11.-',
          image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'
        },
        {
          id: '3',
          name: 'Terrine de campagne maison, chutney de figues',
          description: '',
          price: '18.-',
          image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'
        },
        {
          id: '4',
          name: 'Escargots de Bourgogne et son beurre persillé',
          description: '6 pces / 12 pces',
          price: '12.- / 24.-',
          image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400'
        },
        {
          id: '5',
          name: 'Salade gourmande de chèvre chaud et miel du Valais',
          description: '',
          price: '16.-',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
        }
      ],
      tartes: [
        {
          id: '6',
          name: 'Caviar d\'aubergine, tomates, chèvre, miel, roquettes',
          description: '',
          price: '28.-',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'
        },
        {
          id: '7',
          name: 'Caviar d\'aubergine, tomates, saumon fumé, crème acidulée, roquettes',
          description: '',
          price: '29.-',
          image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400'
        },
        {
          id: '8',
          name: 'Caviar d\'aubergine, tomates, mozzarella, jambon cru',
          description: '',
          price: '28.-',
          image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400'
        }
      ],
      incontournables: [
        {
          id: '9',
          name: 'Smash burger',
          description: 'Bœuf CH / raclette du Valais/oignons confits/tomate/lard',
          price: '29.-',
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'
        },
        {
          id: '10',
          name: 'Steak tartare du chef coupé au couteau',
          description: '',
          price: '36.-',
          image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400'
        },
        {
          id: '11',
          name: 'Boudin noir aux pommes rôties',
          description: '',
          price: '29.-',
          image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
        },
        {
          id: '12',
          name: 'Côte de cochon de la Ferme en Croix et son jus corsé au romarin',
          description: '',
          price: '34.-',
          image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'
        },
        {
          id: '13',
          name: 'Filet de truite arc-en-ciel de Bremgarten, beurre citronné et ses légumes croquants',
          description: '',
          price: '32.-',
          image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400'
        },
        {
          id: '14',
          name: 'Boîte chaude Suisse',
          description: 'Vacherin coulant/pommes de terre/charcuterie artisanale',
          price: '34.50',
          image: 'https://images.unsplash.com/photo-1619740455993-9e4e0b5e9f0f?w=400'
        }
      ],
      formules: [
        {
          id: '15',
          name: 'Plat à choix servi avec son bol de salade et dessert du jour',
          description: '',
          price: '11.-',
          image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'
        },
        {
          id: '16',
          name: 'Onglet de bœuf à l\'échalote confite',
          description: '',
          price: '24.-',
          image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400'
        },
        {
          id: '17',
          name: 'Poulet fermier rôti de la Gruyère crème et morilles',
          description: '',
          price: '24.-',
          image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400'
        },
        {
          id: '18',
          name: 'Marmite du pêcheur, poisson du jour et son bouillon parfumé',
          description: '',
          price: '24.-',
          image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400'
        },
        {
          id: '19',
          name: 'Joue de bœuf braisée en cocotte façon Bourguignonne',
          description: '',
          price: '24.-',
          image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400'
        }
      ],
      desserts: [
        {
          id: '20',
          name: 'Tiramisu spéculoos mangue',
          description: '',
          price: '12.-',
          image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400'
        },
        {
          id: '21',
          name: 'Crème brûlée à la vanille',
          description: '',
          price: '11.-',
          image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400'
        },
        {
          id: '22',
          name: 'Mousse chocolat noir',
          description: '',
          price: '11.-',
          image: 'https://images.unsplash.com/photo-1541599468348-e96984315921?w=400'
        }
      ]
    };

    // Créer ou mettre à jour le contenu menu
    const existing = await Content.findOne({ site: buffet._id, section: 'menu' });
    
    if (existing) {
      existing.data = menuData;
      await existing.save();
      console.log('✅ Menu mis à jour');
    } else {
      await Content.create({
        site: buffet._id,
        section: 'menu',
        type: 'menu',
        data: menuData,
        order: 0,
        isActive: true,
      });
      console.log('✅ Menu créé');
    }

    console.log('\n📊 Statistiques:');
    console.log(`   - Entrées: ${menuData.entrees.length}`);
    console.log(`   - Tartes: ${menuData.tartes.length}`);
    console.log(`   - Incontournables: ${menuData.incontournables.length}`);
    console.log(`   - Formules: ${menuData.formules.length}`);
    console.log(`   - Desserts: ${menuData.desserts.length}`);
    console.log(`   - Total: ${Object.values(menuData).flat().length} plats`);

    console.log('\n✅ Menu Buffet de la Gare configuré avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

setupBuffetMenu();
