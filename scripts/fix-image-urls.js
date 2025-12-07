import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Content from '../src/models/Content.js';
import Media from '../src/models/Media.js';

dotenv.config();

const fixImageUrls = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Fixer les URLs dans Content (menu items)
    const contents = await Content.find({});
    let contentFixed = 0;

    for (const content of contents) {
      let modified = false;
      const data = content.data;

      // Parcourir toutes les sections du menu
      for (const section in data) {
        if (Array.isArray(data[section])) {
          data[section] = data[section].map(item => {
            if (item.image && item.image.includes('speedl.swigs.online')) {
              console.log(`🔧 Fixing: ${item.name}`);
              console.log(`   Old: ${item.image}`);
              item.image = item.image.replace('speedl.swigs.online', 'swigs.online');
              console.log(`   New: ${item.image}`);
              modified = true;
            }
            return item;
          });
        }
      }

      if (modified) {
        content.data = data;
        content.markModified('data');
        await content.save();
        contentFixed++;
      }
    }

    console.log(`\n✅ Fixed ${contentFixed} content documents`);

    // 2. Fixer les URLs dans Media
    const medias = await Media.find({ url: /speedl\.swigs\.online/ });
    console.log(`\n🔍 Found ${medias.length} media with wrong domain`);

    for (const media of medias) {
      const oldUrl = media.url;
      media.url = media.url.replace('speedl.swigs.online', 'swigs.online');
      await media.save();
      console.log(`🔧 Fixed media: ${oldUrl} → ${media.url}`);
    }

    console.log(`\n✅ Fixed ${medias.length} media documents`);
    console.log('\n🎉 All done!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixImageUrls();
