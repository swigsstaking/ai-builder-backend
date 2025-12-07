import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script pour générer un token JWT de service permanent
 * Usage: node src/scripts/generate-service-token.js
 */

const generateServiceToken = () => {
  const payload = {
    id: 'service-control-center',
    email: 'service@swigs.online',
    role: 'admin',
    name: 'Control Center Service',
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '365d' } // Token valide 1 an
  );

  console.log('\n🔑 Token JWT généré pour le Control Center:\n');
  console.log(token);
  console.log('\n📝 Ajoute ce token dans le fichier .env du Control Center:');
  console.log(`VITE_CMS_TOKEN=${token}\n`);
  console.log('⚠️  Ce token est valide 1 an, renouveler avant expiration.\n');

  return token;
};

generateServiceToken();
