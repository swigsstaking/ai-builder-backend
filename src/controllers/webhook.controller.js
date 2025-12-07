import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import logger from '../utils/logger.js';
import fs from 'fs';
import rebuildSiteScript from '../scripts/rebuild-site.js';
import Site from '../models/Site.js';
import Order from '../models/Order.js';
import { confirmOrderPayment } from './order.controller.js';
import { sendOrderConfirmation, sendOrderNotification } from '../services/email.service.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rebuild un site (accepte siteId ou slug)
export const rebuildSite = async (req, res) => {
  try {
    const { siteId, slug } = req.body;
    
    if (!siteId && !slug) {
      return res.status(400).json({
        success: false,
        error: 'siteId ou slug requis',
      });
    }
    
    logger.info(`Déclenchement du rebuild du site (${siteId || slug})...`);
    
    // Exécuter le rebuild en arrière-plan
    rebuildSiteScript({
      siteId,
      siteslug: slug,
      skipDeploy: process.env.NODE_ENV !== 'production',
    }).then((result) => {
      if (result.success) {
        logger.success(`Rebuild terminé en ${result.duration}s`);
      } else {
        logger.error(`Rebuild échoué: ${result.error}`);
      }
    }).catch((error) => {
      logger.error('Erreur rebuild:', error.message);
    });
    
    // Répondre immédiatement (le rebuild se fait en arrière-plan)
    res.json({
      success: true,
      message: 'Rebuild du site déclenché. Le site sera mis à jour dans 1-2 minutes.',
    });
  } catch (error) {
    logger.error('Erreur webhook rebuild:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Obtenir le statut du dernier rebuild
export const getRebuildStatus = async (req, res) => {
  try {
    const logPath = path.join(__dirname, '../../../rebuild.log');
    
    if (!fs.existsSync(logPath)) {
      return res.json({
        success: true,
        data: {
          lastRebuild: null,
          status: 'Aucun rebuild effectué',
        },
      });
    }
    
    // Lire les dernières lignes du log
    const logContent = fs.readFileSync(logPath, 'utf8');
    const lines = logContent.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    
    res.json({
      success: true,
      data: {
        lastRebuild: lastLine,
        totalRebuilds: lines.length,
      },
    });
  } catch (error) {
    logger.error('Erreur status rebuild:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Webhook Stripe (pour paiements e-commerce)
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    // Récupérer le siteId depuis les metadata (si disponible dans l'event)
    // Sinon, on devra le récupérer depuis l'order
    let event;
    
    // On doit d'abord parser l'event pour récupérer le siteId
    // puis vérifier la signature avec la bonne clé
    const payload = req.body;
    
    // Parse l'event sans vérification pour récupérer le siteId
    const tempEvent = JSON.parse(payload.toString());
    let siteId = tempEvent.data?.object?.metadata?.siteId;
    
    // Si pas de siteId dans metadata (cas de payment_intent.succeeded)
    // On ignore cet événement car on gère déjà checkout.session.completed
    if (!siteId) {
      logger.info(`Webhook Stripe: Événement ${tempEvent.type} ignoré (pas de siteId)`);
      return res.json({ received: true, ignored: true });
    }
    
    // Récupérer le site avec sa config Stripe
    const site = await Site.findById(siteId).select('+stripeConfig.webhookSecret +stripeConfig.secretKey');
    
    if (!site || !site.stripeConfig?.webhookSecret || !site.stripeConfig?.secretKey) {
      logger.error(`Webhook Stripe: Configuration manquante pour site ${siteId}`);
      return res.status(400).json({ error: 'Configuration Stripe manquante' });
    }
    
    // Initialiser Stripe avec les clés du site
    const stripe = new Stripe(site.stripeConfig.secretKey);
    
    // Vérifier la signature avec la clé webhook du site
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        site.stripeConfig.webhookSecret
      );
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Traiter l'événement
    logger.info(`📥 Webhook reçu - Type: ${event.type}, Site: ${siteId}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { orderId, orderNumber } = session.metadata;
        
        logger.info(`✅ Paiement confirmé - Site: ${siteId}, Order: ${orderNumber}, OrderId: ${orderId}`);
        
        if (!orderId) {
          logger.error(`❌ orderId manquant dans metadata pour session ${session.id}`);
          break;
        }
        
        // Confirmer le paiement et décrémenter le stock
        try {
          const order = await confirmOrderPayment(orderId);
          logger.info(`✅ Stock décrémenté pour commande ${orderNumber}`);
          
          // Récupérer les infos du site pour les emails
          const orderWithDetails = await Order.findById(orderId).populate('items.product', 'name images');
          
          // Envoyer email de confirmation au client
          try {
            await sendOrderConfirmation({
              to: orderWithDetails.customer.email,
              siteName: site.name,
              siteEmail: site.contact?.email,
              orderNumber: orderWithDetails.orderNumber,
              total: orderWithDetails.total,
              currency: orderWithDetails.currency || 'CHF',
              items: orderWithDetails.items,
              customer: orderWithDetails.customer,
              shipping: orderWithDetails.shipping,
              siteSmtp: site.smtp, // Passer la config SMTP du site
            });
            logger.info(`📧 Email confirmation envoyé à ${orderWithDetails.customer.email}`);
          } catch (emailError) {
            logger.error(`❌ Erreur envoi email confirmation:`, emailError.message);
            // Ne pas bloquer si l'email échoue
          }
          
          // Envoyer email de notification à l'admin
          if (site.contact?.email) {
            try {
              await sendOrderNotification({
                to: site.contact.email,
                siteName: site.name,
                siteEmail: site.contact.email,
                orderNumber: orderWithDetails.orderNumber,
                total: orderWithDetails.total,
                currency: orderWithDetails.currency || 'CHF',
                items: orderWithDetails.items,
                customer: orderWithDetails.customer,
                siteSmtp: site.smtp, // Passer la config SMTP du site
              });
              logger.info(`📧 Email notification envoyé à ${site.contact.email}`);
            } catch (emailError) {
              logger.error(`❌ Erreur envoi email notification:`, emailError.message);
              // Ne pas bloquer si l'email échoue
            }
          }
        } catch (error) {
          logger.error(`❌ Erreur confirmation paiement ${orderNumber}:`, error.message);
          logger.error(`Stack:`, error.stack);
          // Ne pas retourner d'erreur à Stripe pour éviter les retry
        }
        
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        logger.warn(`❌ Paiement échoué - Site: ${siteId}, PI: ${paymentIntent.id}`);
        
        // Mettre à jour le statut de la commande
        const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
        if (order) {
          order.payment.status = 'failed';
          order.status = 'cancelled';
          await order.save();
          logger.info(`Commande ${order.orderNumber} marquée comme échouée`);
        }
        
        // TODO: Envoyer email au client
        
        break;
      }
      
      default:
        logger.info(`Événement Stripe non géré: ${event.type}`);
    }
    
    // Répondre à Stripe
    res.json({ received: true });
  } catch (error) {
    logger.error('Erreur webhook Stripe:', error);
    res.status(500).json({ error: error.message });
  }
};
