import dotenv from 'dotenv';
import { sendContactEmail } from '../src/services/email.service.js';

dotenv.config();

const testEmail = async () => {
  console.log('\n🧪 Test d\'envoi d\'email\n');
  
  // Vérifier les variables d'environnement
  console.log('📋 Configuration SMTP:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || '❌ NON CONFIGURÉ');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || '❌ NON CONFIGURÉ');
  console.log('SMTP_USER:', process.env.SMTP_USER || '❌ NON CONFIGURÉ');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Configuré' : '❌ NON CONFIGURÉ');
  console.log('SMTP_FROM:', process.env.SMTP_FROM || '❌ NON CONFIGURÉ');
  
  if (process.env.NODE_ENV === 'production' && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    console.log('\n❌ ERREUR: Variables SMTP manquantes en production!');
    console.log('\nAjoutez dans .env:');
    console.log('SMTP_HOST=smtp.example.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=votre@email.com');
    console.log('SMTP_PASS=votre_mot_de_passe');
    console.log('SMTP_FROM="Speed-L <noreply@speed-l.ch>"');
    process.exit(1);
  }
  
  // Tester l'envoi
  try {
    console.log('\n📧 Envoi d\'un email de test...');
    
    const result = await sendContactEmail({
      to: 'corentin@swigs.ch',
      siteName: 'Speed-L (TEST)',
      name: 'Test Système',
      email: 'test@example.com',
      phone: '079 212 3500',
      message: 'Ceci est un email de test pour vérifier que le système fonctionne correctement.\n\nSi vous recevez cet email, tout est OK! ✅',
    });
    
    console.log('\n✅ Email envoyé avec succès!');
    console.log('Message ID:', result.messageId);
    console.log('\n📬 Vérifiez la boîte mail: corentin@swigs.ch');
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'envoi:', error.message);
    console.error('\nDétails:', error);
    process.exit(1);
  }
};

testEmail();
