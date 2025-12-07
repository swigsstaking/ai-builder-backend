import jwt from 'jsonwebtoken';
import Customer from '../models/Customer.js';
import logger from '../utils/logger.js';

export const protectCustomer = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.warn('🔒 protectCustomer: Token manquant');
    return res.status(401).json({
      success: false,
      message: 'Non autorisé - Token manquant',
    });
  }

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info(`🔓 protectCustomer: Token décodé - ID: ${decoded.id}, Type: ${decoded.type}`);

    // Vérifier que c'est un token customer
    if (decoded.type !== 'customer') {
      logger.warn(`🔒 protectCustomer: Type invalide - ${decoded.type}`);
      return res.status(401).json({
        success: false,
        message: 'Non autorisé - Token invalide',
      });
    }

    // Récupérer le customer
    req.customer = await Customer.findById(decoded.id).select('-password');

    if (!req.customer) {
      logger.warn(`🔒 protectCustomer: Customer non trouvé - ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'Non autorisé - Customer non trouvé',
      });
    }

    if (!req.customer.isActive) {
      logger.warn(`🔒 protectCustomer: Compte désactivé - ${req.customer.email}`);
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé',
      });
    }

    // Ajouter req.user pour compatibilité avec getCustomerOrders
    req.user = req.customer;
    
    logger.info(`✅ protectCustomer: Authentification réussie - ${req.customer.email}`);
    next();
  } catch (error) {
    logger.warn(`🔒 protectCustomer: Erreur JWT - ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Non autorisé - Token invalide',
    });
  }
};
