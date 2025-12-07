import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';

dotenv.config();

const fixCategoryCounts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const categories = await Category.find();
    console.log(`\n📊 Found ${categories.length} categories`);

    for (const category of categories) {
      const productCount = await Product.countDocuments({ category: category._id });
      
      await Category.findByIdAndUpdate(category._id, {
        productCount: productCount
      });

      console.log(`  ✅ ${category.name}: ${productCount} produits`);
    }

    console.log('\n✅ Category counts fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixCategoryCounts();
