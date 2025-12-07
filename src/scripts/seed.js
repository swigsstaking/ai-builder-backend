import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Site from '../models/Site.js';
import Course from '../models/Course.js';
import SEO from '../models/SEO.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swigs-cms');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Site.deleteMany({});
    await Course.deleteMany({});
    await SEO.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@swigs.online',
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      name: 'Admin SWIGS',
      role: 'admin',
    });
    console.log('👤 Admin user created:', adminUser.email);

    // Create Speed-L site
    const speedLSite = await Site.create({
      name: 'Speed-L Auto-école',
      slug: 'speed-l',
      domain: 'swigs.online',
      description: 'Auto-école à Sion depuis près de 30 ans',
      theme: {
        primaryColor: '#dc2626',
        secondaryColor: '#1f2937',
      },
      contact: {
        phone: '079 212 3500',
        email: 'info@speed-l.ch',
        address: 'Place de la Gare 11',
        city: 'Sion',
        postalCode: '1950',
        country: 'Suisse',
      },
      social: {
        facebook: 'https://facebook.com',
        instagram: 'https://instagram.com',
        tiktok: 'https://tiktok.com',
      },
    });
    console.log('🏢 Site created:', speedLSite.name);

    // Add site to admin user
    adminUser.sites.push(speedLSite._id);
    await adminUser.save();

    // Create courses
    const courses = await Course.insertMany([
      {
        site: speedLSite._id,
        title: 'Cours de sensibilisation',
        number: 'N°609',
        description: 'Cours obligatoire pour tous les nouveaux conducteurs. Formation complète sur les risques de la route.',
        category: 'sensibilisation',
        price: {
          amount: 280,
          currency: 'CHF',
          display: 'CHF 280.-',
        },
        duration: '2 soirées',
        dates: [
          {
            day: 'Mercredi',
            date: new Date('2025-10-22'),
            time: '18h25',
          },
          {
            day: 'Jeudi',
            date: new Date('2025-10-23'),
            time: '18h25',
          },
        ],
        status: 'active',
        order: 1,
      },
      {
        site: speedLSite._id,
        title: 'Cours Moto / Scooter',
        number: 'N°402',
        description: 'Formation pratique pour la conduite de motos et scooters. Apprentissage des techniques de base.',
        category: 'moto',
        price: {
          amount: 350,
          currency: 'CHF',
          display: 'CHF 350.-',
        },
        duration: '3 jours',
        dates: [
          {
            day: 'Samedi',
            date: new Date('2025-11-01'),
            time: '8h00',
          },
          {
            day: 'Dimanche',
            date: new Date('2025-11-02'),
            time: '8h00',
          },
          {
            day: 'Samedi',
            date: new Date('2025-11-08'),
            time: '8h00',
          },
        ],
        status: 'active',
        order: 2,
      },
      {
        site: speedLSite._id,
        title: 'Cours de premiers secours',
        number: 'N°141',
        description: 'Formation aux gestes de premiers secours. Obligatoire pour l\'obtention du permis de conduire.',
        category: 'secours',
        price: {
          amount: 150,
          currency: 'CHF',
          display: 'CHF 150.-',
        },
        duration: '2 jours',
        dates: [
          {
            day: 'Vendredi',
            date: new Date('2025-11-21'),
            time: 'Journée complète',
          },
          {
            day: 'Samedi',
            date: new Date('2025-11-22'),
            time: 'Journée complète',
          },
        ],
        status: 'active',
        order: 3,
      },
    ]);
    console.log(`📚 ${courses.length} courses created`);

    // Create SEO entries
    const seoEntries = await SEO.insertMany([
      {
        site: speedLSite._id,
        page: 'home',
        title: 'Speed-L - Auto-école à Sion | Valais',
        description: 'Votre école de conduite à Sion depuis près de 30 ans. Cours de sensibilisation, permis voiture, moto et scooter. Qualité et professionnalisme.',
        keywords: ['auto-école', 'sion', 'valais', 'permis de conduire', 'cours de conduite'],
        ogTitle: 'Speed-L - Auto-école à Sion',
        ogDescription: 'École de conduite professionnelle à Sion depuis 30 ans',
        robots: 'index,follow',
      },
      {
        site: speedLSite._id,
        page: 'cours',
        title: 'Cours & Inscriptions - Speed-L Auto-école',
        description: 'Découvrez nos cours de sensibilisation, moto/scooter et premiers secours. Inscrivez-vous en ligne facilement.',
        keywords: ['cours de sensibilisation', 'cours moto', 'premiers secours', 'inscription'],
        robots: 'index,follow',
      },
    ]);
    console.log(`🔍 ${seoEntries.length} SEO entries created`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin123!'}`);
    console.log('\n🚀 You can now start the server with: npm run dev');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
