import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Configuration du transporteur email
const createTransporter = (customSmtp = null) => {
  // Si SMTP personnalisé fourni et activé, l'utiliser
  if (customSmtp && customSmtp.enabled) {
    logger.info(`📧 Utilisation SMTP personnalisé: ${customSmtp.host}`);
    return nodemailer.createTransport({
      host: customSmtp.host,
      port: customSmtp.port || 587,
      secure: customSmtp.secure || false,
      auth: {
        user: customSmtp.user,
        pass: customSmtp.pass,
      },
    });
  }
  
  // Sinon, utiliser SMTP par défaut (swigs.online)
  if (process.env.NODE_ENV === 'production') {
    logger.info(`📧 Utilisation SMTP par défaut: ${process.env.SMTP_HOST || 'swigs.online'}`);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.swigs.online',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // En développement, utiliser Ethereal (emails de test)
  logger.info(`📧 Mode développement: Ethereal`);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER || 'test@ethereal.email',
      pass: process.env.ETHEREAL_PASS || 'test',
    },
  });
};

/**
 * Envoyer un email de formulaire de contact
 */
export const sendContactEmail = async ({ to, siteName, name, email, phone, message, siteSmtp = null }) => {
  try {
    const transporter = createTransporter(siteSmtp);
    
    // Déterminer l'expéditeur
    const fromEmail = siteSmtp?.fromEmail || 'noreply@swigs.online';
    const fromName = siteSmtp?.fromName || siteName;
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `[${siteName}] Nouveau message de ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #6b7280; }
            .value { margin-top: 5px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📧 Nouveau message de contact</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Nom :</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">Email :</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>
              ${phone ? `
              <div class="field">
                <div class="label">Téléphone :</div>
                <div class="value"><a href="tel:${phone}">${phone}</a></div>
              </div>
              ` : ''}
              <div class="field">
                <div class="label">Message :</div>
                <div class="value">${message.replace(/\n/g, '<br>')}</div>
              </div>
            </div>
            <div class="footer">
              <p>Ce message a été envoyé depuis le formulaire de contact de ${siteName}</p>
              <p>Géré par SWIGS CMS</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Nouveau message de contact - ${siteName}

Nom: ${name}
Email: ${email}
${phone ? `Téléphone: ${phone}` : ''}

Message:
${message}

---
Ce message a été envoyé depuis le formulaire de contact de ${siteName}
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.success(`Email de contact envoyé: ${info.messageId}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Erreur envoi email contact:', error.message);
    throw error;
  }
};

/**
 * Envoyer un email de demande de bon cadeau
 */
/**
 * Envoyer email de confirmation de commande au client
 */
export const sendOrderConfirmation = async ({ to, siteName, siteEmail, orderNumber, total, currency, items, customer, shipping, siteSmtp = null }) => {
  try {
    const transporter = createTransporter(siteSmtp);
    
    const fromEmail = siteSmtp?.fromEmail || 'noreply@swigs.online';
    const fromName = siteSmtp?.fromName || siteName;
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          ${item.productName}${item.variant ? ` (${item.variant})` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${item.price.toFixed(2)} ${currency}
        </td>
      </tr>
    `).join('');
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `Confirmation de commande #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .order-number { font-size: 24px; font-weight: bold; color: #10b981; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .total { font-size: 20px; font-weight: bold; color: #10b981; text-align: right; margin-top: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ Commande confirmée !</h2>
            </div>
            <div class="content">
              <p>Bonjour ${customer.firstName},</p>
              <p>Merci pour votre commande ! Nous avons bien reçu votre paiement.</p>
              
              <div class="order-number">Commande #${orderNumber}</div>
              
              <h3>Récapitulatif</h3>
              <table>
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Produit</th>
                    <th style="padding: 10px; text-align: center;">Quantité</th>
                    <th style="padding: 10px; text-align: right;">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div class="total">Total: ${total.toFixed(2)} ${currency}</div>
              
              <h3 style="margin-top: 30px;">Adresse de livraison</h3>
              <p>
                ${customer.firstName} ${customer.lastName}<br>
                ${shipping.address.street}<br>
                ${shipping.address.postalCode} ${shipping.address.city}<br>
                ${shipping.address.country}
              </p>
              
              <p style="margin-top: 30px;">Nous préparons votre commande et vous tiendrons informé de son expédition.</p>
            </div>
            <div class="footer">
              <p>Merci de votre confiance !</p>
              <p>${siteName}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Confirmation de commande #${orderNumber}

Bonjour ${customer.firstName},

Merci pour votre commande ! Nous avons bien reçu votre paiement.

Récapitulatif:
${items.map(item => `- ${item.productName}${item.variant ? ` (${item.variant})` : ''} x${item.quantity} - ${item.price.toFixed(2)} ${currency}`).join('\n')}

Total: ${total.toFixed(2)} ${currency}

Adresse de livraison:
${customer.firstName} ${customer.lastName}
${shipping.address.street}
${shipping.address.postalCode} ${shipping.address.city}
${shipping.address.country}

Nous préparons votre commande et vous tiendrons informé de son expédition.

Merci de votre confiance !
${siteName}
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.success(`Email confirmation commande envoyé: ${info.messageId}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Erreur envoi email confirmation commande:', error.message);
    throw error;
  }
};

/**
 * Envoyer notification nouvelle commande à l'admin
 */
export const sendOrderNotification = async ({ to, siteName, siteEmail, orderNumber, total, currency, items, customer, siteSmtp = null }) => {
  try {
    const transporter = createTransporter(siteSmtp);
    
    const fromEmail = siteSmtp?.fromEmail || 'noreply@swigs.online';
    const fromName = siteSmtp?.fromName || siteName;
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `🛒 Nouvelle commande #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .order-number { font-size: 24px; font-weight: bold; color: #3b82f6; margin: 20px 0; }
            .total { font-size: 20px; font-weight: bold; color: #3b82f6; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🛒 Nouvelle commande !</h2>
            </div>
            <div class="content">
              <div class="order-number">Commande #${orderNumber}</div>
              <div class="total">Montant: ${total.toFixed(2)} ${currency}</div>
              
              <h3 style="margin-top: 30px;">Client</h3>
              <p>
                ${customer.firstName} ${customer.lastName}<br>
                <a href="mailto:${customer.email}">${customer.email}</a><br>
                ${customer.phone || ''}
              </p>
              
              <h3>Produits (${items.length})</h3>
              <ul>
                ${items.map(item => `<li>${item.productName}${item.variant ? ` (${item.variant})` : ''} x${item.quantity}</li>`).join('')}
              </ul>
              
              <a href="https://admin.swigs.online" class="button">Voir dans l'admin</a>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Nouvelle commande #${orderNumber}

Montant: ${total.toFixed(2)} ${currency}

Client:
${customer.firstName} ${customer.lastName}
${customer.email}
${customer.phone || ''}

Produits:
${items.map(item => `- ${item.productName}${item.variant ? ` (${item.variant})` : ''} x${item.quantity}`).join('\n')}

Voir dans l'admin: https://admin.swigs.online
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.success(`Email notification commande envoyé: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Erreur envoi email notification commande:', error.message);
    throw error;
  }
};

/**
 * Envoyer email de bienvenue
 */
export const sendWelcomeEmail = async ({ to, siteName, siteEmail, firstName, siteSmtp = null }) => {
  try {
    const transporter = createTransporter(siteSmtp);
    
    const fromEmail = siteSmtp?.fromEmail || 'noreply@swigs.online';
    const fromName = siteSmtp?.fromName || siteName;
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `Bienvenue sur ${siteName} !`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>👋 Bienvenue !</h2>
            </div>
            <div class="content">
              <p>Bonjour ${firstName},</p>
              <p>Merci de vous être inscrit sur ${siteName} !</p>
              <p>Votre compte a été créé avec succès. Vous pouvez maintenant profiter de tous nos services.</p>
              <p>À bientôt !</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Bienvenue ${firstName} !

Merci de vous être inscrit sur ${siteName} !

Votre compte a été créé avec succès.

À bientôt !
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.success(`Email bienvenue envoyé: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Erreur envoi email bienvenue:', error.message);
    throw error;
  }
};

/**
 * Envoyer email de mise à jour statut commande
 */
export const sendOrderStatusUpdate = async ({ to, siteName, siteEmail, orderNumber, status, trackingNumber, trackingUrl, customer, siteSmtp = null }) => {
  try {
    const transporter = createTransporter(siteSmtp);
    
    const fromEmail = siteSmtp?.fromEmail || 'noreply@swigs.online';
    const fromName = siteSmtp?.fromName || siteName;
    
    const statusMessages = {
      processing: { title: '⏳ Commande en préparation', message: 'Votre commande est en cours de préparation.' },
      shipped: { title: '📦 Commande expédiée', message: 'Votre commande a été expédiée !' },
      delivered: { title: '✅ Commande livrée', message: 'Votre commande a été livrée.' },
      cancelled: { title: '❌ Commande annulée', message: 'Votre commande a été annulée.' },
    };
    
    const statusInfo = statusMessages[status] || { title: '📋 Mise à jour commande', message: 'Le statut de votre commande a été mis à jour.' };
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `${statusInfo.title} - Commande #${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .order-number { font-size: 20px; font-weight: bold; color: #3b82f6; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${statusInfo.title}</h2>
            </div>
            <div class="content">
              <p>Bonjour ${customer.firstName},</p>
              <p>${statusInfo.message}</p>
              <div class="order-number">Commande #${orderNumber}</div>
              ${trackingNumber ? `
                <h3>Suivi de colis</h3>
                <p>Numéro de suivi: <strong>${trackingNumber}</strong></p>
                ${trackingUrl ? `<a href="${trackingUrl}" class="button">Suivre mon colis</a>` : ''}
              ` : ''}
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
${statusInfo.title}

Bonjour ${customer.firstName},

${statusInfo.message}

Commande #${orderNumber}

${trackingNumber ? `Numéro de suivi: ${trackingNumber}\n${trackingUrl ? `Suivre: ${trackingUrl}` : ''}` : ''}
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.success(`Email statut commande envoyé: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Erreur envoi email statut commande:', error.message);
    throw error;
  }
};

export const sendGiftCardEmail = async ({ to, siteName, name, email, phone, amount, recipientName, recipientEmail, deliveryDate, message, siteSmtp = null }) => {
  try {
    const transporter = createTransporter(siteSmtp);
    
    const fromEmail = siteSmtp?.fromEmail || 'noreply@swigs.online';
    const fromName = siteSmtp?.fromName || siteName;
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `[${siteName}] Demande de bon cadeau - ${amount}€`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #6b7280; }
            .value { margin-top: 5px; }
            .amount { font-size: 24px; font-weight: bold; color: #dc2626; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🎁 Demande de bon cadeau</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Montant :</div>
                <div class="value amount">${amount}€</div>
              </div>
              
              <h3 style="margin-top: 30px; color: #374151;">Acheteur</h3>
              <div class="field">
                <div class="label">Nom :</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">Email :</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>
              ${phone ? `
              <div class="field">
                <div class="label">Téléphone :</div>
                <div class="value"><a href="tel:${phone}">${phone}</a></div>
              </div>
              ` : ''}
              
              <h3 style="margin-top: 30px; color: #374151;">Bénéficiaire</h3>
              <div class="field">
                <div class="label">Nom :</div>
                <div class="value">${recipientName}</div>
              </div>
              ${recipientEmail ? `
              <div class="field">
                <div class="label">Email :</div>
                <div class="value"><a href="mailto:${recipientEmail}">${recipientEmail}</a></div>
              </div>
              ` : ''}
              ${deliveryDate ? `
              <div class="field">
                <div class="label">Date de livraison souhaitée :</div>
                <div class="value">${new Date(deliveryDate).toLocaleDateString('fr-FR')}</div>
              </div>
              ` : ''}
              
              ${message ? `
              <div class="field">
                <div class="label">Message :</div>
                <div class="value">${message.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>Cette demande a été envoyée depuis le formulaire de bons cadeaux de ${siteName}</p>
              <p>Géré par SWIGS CMS</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Demande de bon cadeau - ${siteName}

Montant: ${amount}€

Acheteur:
Nom: ${name}
Email: ${email}
${phone ? `Téléphone: ${phone}` : ''}

Bénéficiaire:
Nom: ${recipientName}
${recipientEmail ? `Email: ${recipientEmail}` : ''}
${deliveryDate ? `Date de livraison: ${new Date(deliveryDate).toLocaleDateString('fr-FR')}` : ''}

${message ? `Message:\n${message}` : ''}

---
Cette demande a été envoyée depuis le formulaire de bons cadeaux de ${siteName}
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.success(`Email bon cadeau envoyé: ${info.messageId}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Erreur envoi email bon cadeau:', error.message);
    throw error;
  }
};
