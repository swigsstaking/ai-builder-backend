import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site.js';
import SEO from '../models/SEO.js';
import Content from '../models/Content.js';

dotenv.config();

const diagnostic = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connecté à MongoDB\n');

    // 1. SITES
    console.log('═══════════════════════════════════════');
    console.log('1. SITES');
    console.log('═══════════════════════════════════════');
    const sites = await Site.find({}, { name: 1, slug: 1, pages: 1 });
    for (const site of sites) {
      console.log(`\n📍 ${site.name} (${site.slug})`);
      console.log(`   Pages configurées: ${site.pages?.length || 0}`);
      if (site.pages) {
        site.pages.forEach(p => console.log(`      - ${p.value}: ${p.label}`));
      }
    }

    // 2. SEO
    console.log('\n\n═══════════════════════════════════════');
    console.log('2. SEO');
    console.log('═══════════════════════════════════════');
    for (const site of sites) {
      const seos = await SEO.find({ site: site._id }, { page: 1, title: 1 });
      console.log(`\n📍 ${site.name}`);
      console.log(`   SEO existants: ${seos.length}`);
      seos.forEach(s => console.log(`      - ${s.page}: ${s.title.substring(0, 50)}...`));
    }

    // 3. CONTENT - MENU
    console.log('\n\n═══════════════════════════════════════');
    console.log('3. CONTENT - MENU BUFFET');
    console.log('═══════════════════════════════════════');
    const buffet = sites.find(s => s.slug === 'buffet');
    if (buffet) {
      const menuContent = await Content.find({ 
        site: buffet._id, 
        type: 'menu' 
      });
      console.log(`\n📍 Documents menu trouvés: ${menuContent.length}`);
      menuContent.forEach((m, i) => {
        console.log(`\n   Document ${i + 1}:`);
        console.log(`      _id: ${m._id}`);
        console.log(`      section: ${m.section}`);
        console.log(`      type: ${m.type}`);
        if (m.data) {
          const sections = Object.keys(m.data);
          console.log(`      Sections dans data: ${sections.join(', ')}`);
          sections.forEach(sec => {
            const items = m.data[sec];
            if (Array.isArray(items)) {
              console.log(`         ${sec}: ${items.length} plats`);
            }
          });
        }
      });
    }

    // 4. CONTENT - ÉVÉNEMENTS
    console.log('\n\n═══════════════════════════════════════');
    console.log('4. CONTENT - ÉVÉNEMENTS BUFFET');
    console.log('═══════════════════════════════════════');
    if (buffet) {
      const eventsContent = await Content.find({ 
        site: buffet._id, 
        section: 'events' 
      });
      console.log(`\n📍 Documents événements trouvés: ${eventsContent.length}`);
      eventsContent.forEach((e, i) => {
        console.log(`\n   Événement ${i + 1}:`);
        console.log(`      _id: ${e._id}`);
        console.log(`      section: ${e.section}`);
        console.log(`      type: ${e.type}`);
        if (e.data) {
          console.log(`      Titre: ${e.data.title || 'N/A'}`);
          console.log(`      Date: ${e.data.date || 'N/A'}`);
        }
      });
    }

    console.log('\n\n═══════════════════════════════════════');
    console.log('FIN DIAGNOSTIC');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

diagnostic();
