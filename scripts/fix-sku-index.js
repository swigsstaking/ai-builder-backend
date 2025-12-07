import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../src/models/Product.js';

dotenv.config();

const fixSkuIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Convertir tous les SKU vides en null
    const result = await Product.updateMany(
      { sku: '' },
      { $set: { sku: null } }
    );
    console.log(`✅ Converted ${result.modifiedCount} empty SKU to null`);

    // 2. Supprimer l'ancien index
    try {
      await Product.collection.dropIndex('sku_1');
      console.log('✅ Dropped old sku_1 index');
    } catch (error) {
      console.log('⚠️  Index sku_1 not found or already dropped');
    }

    // 3. Créer le nouvel index sparse
    await Product.collection.createIndex(
      { sku: 1 },
      { unique: true, sparse: true }
    );
    console.log('✅ Created new sparse unique index on sku');

    // 4. Vérifier les index
    const indexes = await Product.collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key, index.unique ? '(unique)' : '', index.sparse ? '(sparse)' : '');
    });

    console.log('\n✅ SKU index fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixSkuIndex();
