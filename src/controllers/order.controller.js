import mongoose from 'mongoose';
import Stripe from 'stripe';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Site from '../models/Site.js';
import PromoCode from '../models/PromoCode.js';
import logger from '../utils/logger.js';
import { sendOrderStatusUpdate } from '../services/email.service.js';
import { incrementPromoCodeUsage } from './promoCode.controller.js';

// Récupérer toutes les commandes (avec filtres selon permissions)
export const getOrders = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId, status, dateFrom, dateTo, search } = req.query;
    
    let query = {};
    
    // Filtre selon rôle
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    // Filtres additionnels
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.firstName': { $regex: search, $options: 'i' } },
        { 'customer.lastName': { $regex: search, $options: 'i' } },
      ];
    }
    
    const orders = await Order.find(query)
      .populate('site', 'name slug')
      .populate('items.product', 'name slug')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    logger.error('Error getting orders:', error);
    next(error);
  }
};

// Récupérer une commande par ID
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('site', 'name slug')
      .populate('items.product', 'name slug images')
      .populate('statusHistory.changedBy', 'name email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }
    
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error getting order:', error);
    next(error);
  }
};

// Mettre à jour le statut d'une commande
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note, trackingNumber, trackingUrl, carrier } = req.body;
    const userId = req.user._id;
    
    logger.info(`📦 Update order status - ID: ${req.params.id}, Status: ${status}, User: ${userId}`);
    
    const order = await Order.findById(req.params.id).populate('site', 'name contact smtp');
    
    if (!order) {
      logger.error(`❌ Order not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }
    
    logger.info(`✅ Order found: ${order.orderNumber}, Current status: ${order.status}`);
    
    // Mettre à jour le statut
    order.status = status;
    
    // Si statut = shipped, ajouter les infos de tracking
    if (status === 'shipped' && trackingNumber) {
      order.shipping.trackingNumber = trackingNumber;
      order.shipping.trackingUrl = trackingUrl;
      order.shipping.carrier = carrier;
      order.shipping.shippedAt = new Date();
    }
    
    // Ajouter à l'historique
    order.statusHistory.push({
      status,
      changedBy: userId,
      changedAt: new Date(),
      note,
    });
    
    await order.save();
    
    logger.info(`Order status updated: ${order.orderNumber} -> ${status}`);
    
    // Envoyer email au client selon le statut
    try {
      await sendOrderStatusUpdate({
        to: order.customer.email,
        siteName: order.site?.name || 'Notre boutique',
        siteEmail: order.site?.contact?.email,
        orderNumber: order.orderNumber,
        status: status,
        trackingNumber: order.shipping?.trackingNumber,
        trackingUrl: order.shipping?.trackingUrl,
        customer: order.customer,
        siteSmtp: order.site?.smtp, // Passer la config SMTP du site
      });
      logger.info(`📧 Email statut envoyé à ${order.customer.email}`);
    } catch (emailError) {
      logger.error(`❌ Erreur envoi email statut:`, emailError.message);
      // Ne pas bloquer si l'email échoue
    }
    
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error updating order status:', error);
    next(error);
  }
};

// Mettre à jour le tracking
export const updateOrderTracking = async (req, res, next) => {
  try {
    const { trackingNumber } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { trackingNumber, status: 'shipped' },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }
    
    logger.info(`Order tracking updated: ${order.orderNumber} -> ${trackingNumber}`);
    
    // TODO: Envoyer email au client avec le tracking
    
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error updating order tracking:', error);
    next(error);
  }
};

// Mettre à jour les notes
export const updateOrderNotes = async (req, res, next) => {
  try {
    const { adminNotes } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { adminNotes },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }
    
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error updating order notes:', error);
    next(error);
  }
};

// Supprimer une commande (admin uniquement)
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }
    
    logger.info(`Order deleted: ${order.orderNumber}`);
    
    res.json({
      success: true,
      message: 'Commande supprimée',
    });
  } catch (error) {
    logger.error('Error deleting order:', error);
    next(error);
  }
};

// ROUTES PUBLIQUES (pour frontend)

// Créer une commande publique
export const createPublicOrder = async (req, res, next) => {
  try {
    const { items, customer, shipping, billing, siteId, currency, promoCode } = req.body;
    
    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La commande doit contenir au moins un produit',
      });
    }
    
    // Calculer les totaux
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Produit ${item.productId} non trouvé`,
        });
      }
      
      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Le produit ${product.name} n'est plus disponible`,
        });
      }
      
      // Vérifier le stock
      if (product.stock.trackInventory && !product.stock.allowBackorder) {
        if (product.stock.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Stock insuffisant pour ${product.name}. Disponible: ${product.stock.quantity}`,
          });
        }
      }
      
      const itemTotal = product.price.amount * item.quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images[0],
        variant: item.variant,
        sku: product.sku,
        quantity: item.quantity,
        price: product.price.amount,
        total: itemTotal,
      });
    }
    
    // Appliquer le code promo si fourni
    let discount = 0;
    let promoCodeData = null;
    
    if (promoCode) {
      const promo = await PromoCode.findOne({
        code: promoCode.toUpperCase(),
        site: siteId,
      });
      
      if (promo) {
        const validation = promo.isValid();
        if (validation.valid) {
          discount = promo.calculateDiscount(subtotal);
          promoCodeData = {
            code: promo.code,
            type: promo.type,
            value: promo.value,
            discount,
          };
          logger.info(`Code promo appliqué: ${promo.code}, réduction: ${discount}`);
        } else {
          logger.warn(`Code promo invalide: ${promoCode} - ${validation.message}`);
        }
      } else {
        logger.warn(`Code promo non trouvé: ${promoCode}`);
      }
    }
    
    // Calculer la TVA (exemple: 7.7% pour la Suisse)
    const taxRate = shipping?.address?.country === 'CH' ? 0.077 : 0;
    const tax = (subtotal - discount) * taxRate;
    const shippingCost = shipping?.cost || 0;
    const total = subtotal - discount + tax + shippingCost;
    
    // Récupérer le site avec config Stripe
    const site = await Site.findById(siteId).select('+stripeConfig.secretKey');
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé',
      });
    }
    
    if (!site.stripeConfig?.secretKey) {
      return res.status(500).json({
        success: false,
        message: 'Configuration Stripe manquante pour ce site',
      });
    }
    
    // Générer un numéro de commande unique
    const orderCount = await Order.countDocuments({ site: siteId });
    const orderNumber = `${site.slug.toUpperCase()}-${Date.now()}-${orderCount + 1}`;
    
    // Créer la commande
    const order = await Order.create({
      site: siteId,
      orderNumber,
      customer,
      items: orderItems,
      subtotal,
      shipping,
      billing,
      tax,
      promoCode: promoCodeData,
      total,
      currency: currency || 'CHF',
      status: 'pending',
      payment: {
        status: 'pending',
      },
    });
    
    // Initialiser Stripe avec les clés du site
    const stripe = new Stripe(site.stripeConfig.secretKey);
    
    // Créer session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: orderItems.map(item => ({
        price_data: {
          currency: (currency || 'CHF').toLowerCase(),
          product_data: {
            name: item.productName,
            images: item.productImage ? [item.productImage] : [],
          },
          unit_amount: Math.round(item.price * 100), // Stripe utilise les centimes
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `https://${site.domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://${site.domain}/checkout?cancelled=true`,
      metadata: {
        siteId: siteId.toString(),
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      },
      customer_email: customer.email,
    });
    
    // Stocker l'ID de session Stripe
    order.stripePaymentIntentId = session.id;
    await order.save();
    
    logger.info(`Order created: ${order.orderNumber} - ${total} ${currency || 'CHF'} - Stripe session: ${session.id}`);
    
    res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.currency,
        checkoutUrl: session.url, // URL pour rediriger vers Stripe Checkout
      },
    });
  } catch (error) {
    logger.error('Error creating public order:', error);
    next(error);
  }
};

// Récupérer une commande publique par numéro
export const getPublicOrder = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber })
      .select('-adminNotes -statusHistory')
      .populate('items.product', 'name slug images');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée',
      });
    }
    
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error getting public order:', error);
    next(error);
  }
};

// Récupérer les commandes d'un customer authentifié
export const getCustomerOrders = async (req, res, next) => {
  try {
    const customerEmail = req.user.email;
    
    logger.info(`🔍 Recherche commandes pour customer: ${customerEmail}`);
    
    const orders = await Order.find({ 'customer.email': customerEmail })
      .select('-adminNotes -statusHistory')
      .populate('items.product', 'name slug images')
      .sort({ createdAt: -1 });
    
    logger.info(`📦 ${orders.length} commande(s) trouvée(s) pour ${customerEmail}`);
    
    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    logger.error('Error getting customer orders:', error);
    next(error);
  }
};

// Confirmer le paiement et décrémenter le stock (appelé par webhook Stripe)
export const confirmOrderPayment = async (orderId) => {
  try {
    // Récupérer la commande
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Commande non trouvée');
    }
    
    // Décrémenter le stock pour chaque produit
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        logger.warn(`Produit ${item.productName} non trouvé pour commande ${order.orderNumber}`);
        continue; // Continue avec les autres produits
      }
      
      // Vérifier et décrémenter le stock
      if (product.stock.trackInventory) {
        if (product.stock.quantity < item.quantity && !product.stock.allowBackorder) {
          logger.warn(`Stock insuffisant pour ${product.name} dans commande ${order.orderNumber}`);
          // Continue quand même car le paiement est déjà fait
        }
        
        // Décrémentation atomique
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              'stock.quantity': -item.quantity,
              'sales': item.quantity,
            },
          }
        );
      }
    }
    
    // Mettre à jour le statut de la commande
    order.status = 'processing';
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
    await order.save();
    
    // Incrémenter le compteur d'utilisation du code promo si utilisé
    if (order.promoCode?.code) {
      await incrementPromoCodeUsage(order.promoCode.code, order.site);
    }
    
    logger.info(`✅ Order payment confirmed: ${order.orderNumber} - Stock decremented`);
    
    return order;
  } catch (error) {
    logger.error('❌ Error confirming order payment:', error);
    throw error;
  }
};
