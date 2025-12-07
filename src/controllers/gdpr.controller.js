import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';

// Exporter toutes les données d'un client (RGPD Article 15)
export const exportCustomerData = async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    
    // Récupérer le customer complet
    const customer = await Customer.findById(customerId)
      .select('-password -resetPasswordToken -verificationToken')
      .populate('site', 'name domain');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé',
      });
    }
    
    // Récupérer toutes les commandes
    const orders = await Order.find({ 'customer.email': customer.email })
      .populate('site', 'name')
      .populate('items.product', 'name');
    
    // Construire l'export
    const exportData = {
      exportDate: new Date().toISOString(),
      personalData: {
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        addresses: customer.addresses,
        preferences: customer.preferences,
        createdAt: customer.createdAt,
        lastLogin: customer.lastLogin,
      },
      gdprConsents: customer.gdpr,
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        date: order.createdAt,
        status: order.status,
        total: order.total,
        currency: order.currency,
        items: order.items.map(item => ({
          product: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
        shipping: order.shipping,
      })),
      statistics: {
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
      },
    };
    
    // Mettre à jour la date du dernier export
    customer.gdpr.lastDataExport = new Date();
    await customer.save();
    
    logger.info(`Export RGPD pour ${customer.email}`);
    
    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('Error exporting customer data:', error);
    next(error);
  }
};

// Supprimer le compte client (RGPD Article 17 - Droit à l'effacement)
export const deleteCustomerAccount = async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    const { confirmEmail } = req.body;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé',
      });
    }
    
    // Vérification email pour confirmation
    if (confirmEmail !== customer.email) {
      return res.status(400).json({
        success: false,
        message: 'Email de confirmation incorrect',
      });
    }
    
    // Anonymiser les commandes au lieu de les supprimer (obligation légale de garder les factures)
    await Order.updateMany(
      { 'customer.email': customer.email },
      {
        $set: {
          'customer.firstName': 'Utilisateur',
          'customer.lastName': 'Supprimé',
          'customer.email': `deleted-${Date.now()}@anonymized.local`,
          'customer.phone': '',
          'shipping.address': {
            street: 'Adresse supprimée',
            city: 'Ville supprimée',
            postalCode: '00000',
            country: 'CH',
          },
          'billing.address': {
            street: 'Adresse supprimée',
            city: 'Ville supprimée',
            postalCode: '00000',
            country: 'CH',
          },
        },
      }
    );
    
    // Supprimer le compte client
    await Customer.findByIdAndDelete(customerId);
    
    logger.info(`Compte supprimé (RGPD): ${customer.email}`);
    
    res.json({
      success: true,
      message: 'Votre compte a été supprimé avec succès',
    });
  } catch (error) {
    logger.error('Error deleting customer account:', error);
    next(error);
  }
};

// Mettre à jour les consentements RGPD
export const updateConsent = async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    const { marketingConsent, dataProcessingConsent } = req.body;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé',
      });
    }
    
    // Mettre à jour les consentements
    if (marketingConsent !== undefined) {
      customer.gdpr.marketingConsent = marketingConsent;
    }
    
    if (dataProcessingConsent !== undefined) {
      // Le consentement au traitement des données ne peut pas être retiré
      // car il est nécessaire pour utiliser le service
      if (!dataProcessingConsent) {
        return res.status(400).json({
          success: false,
          message: 'Le consentement au traitement des données est requis pour utiliser le service',
        });
      }
      customer.gdpr.dataProcessingConsent = dataProcessingConsent;
    }
    
    customer.gdpr.consentDate = new Date();
    await customer.save();
    
    logger.info(`Consentements RGPD mis à jour pour ${customer.email}`);
    
    res.json({
      success: true,
      data: customer.gdpr,
    });
  } catch (error) {
    logger.error('Error updating consent:', error);
    next(error);
  }
};

// Récupérer les consentements actuels
export const getConsent = async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    
    const customer = await Customer.findById(customerId).select('gdpr');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé',
      });
    }
    
    res.json({
      success: true,
      data: customer.gdpr,
    });
  } catch (error) {
    logger.error('Error getting consent:', error);
    next(error);
  }
};
