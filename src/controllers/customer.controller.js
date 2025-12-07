import jwt from 'jsonwebtoken';
import Customer from '../models/Customer.js';
import Site from '../models/Site.js';
import Order from '../models/Order.js';
import { OAuth2Client } from 'google-auth-library';
import { sendWelcomeEmail } from '../services/email.service.js';
import logger from '../utils/logger.js';

// Générer JWT token
const generateToken = (id) => {
  return jwt.sign({ id, type: 'customer' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register customer
// @route   POST /api/customers/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, siteId } = req.body;

    // Vérifier si le customer existe déjà (globalement, pas par site)
    const existingCustomer = await Customer.findOne({ email });
    
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Un compte existe déjà avec cet email. Veuillez vous connecter.',
      });
    }

    // Créer le customer
    const customer = await Customer.create({
      site: siteId,
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    // Générer token
    const token = generateToken(customer._id);
    
    // Envoyer email de bienvenue
    try {
      const site = await Site.findById(siteId);
      await sendWelcomeEmail({
        to: customer.email,
        siteName: site?.name || 'Notre boutique',
        siteEmail: site?.contact?.email,
        firstName: customer.firstName,
        siteSmtp: site?.smtp, // Passer la config SMTP du site
      });
      logger.info(`📧 Email bienvenue envoyé à ${customer.email}`);
    } catch (emailError) {
      logger.error(`❌ Erreur envoi email bienvenue:`, emailError.message);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    res.status(201).json({
      success: true,
      data: {
        _id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login customer
// @route   POST /api/customers/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password, siteId } = req.body;

    // Vérifier email et password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis',
      });
    }

    // Trouver le customer avec le password (globalement, pas par site)
    const customer = await Customer.findOne({ email }).select('+password');

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await customer.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Vérifier si le compte est actif
    if (!customer.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été désactivé',
      });
    }

    // Mettre à jour lastLogin
    customer.lastLogin = new Date();
    await customer.save();

    // Générer token
    const token = generateToken(customer._id);

    res.json({
      success: true,
      data: {
        _id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        addresses: customer.addresses,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer profile
// @route   GET /api/customers/profile
// @access  Private (customer)
export const getProfile = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.customer._id);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer profile
// @route   PUT /api/customers/profile
// @access  Private (customer)
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, preferences } = req.body;

    const customer = await Customer.findById(req.customer._id);

    if (firstName) customer.firstName = firstName;
    if (lastName) customer.lastName = lastName;
    if (phone) customer.phone = phone;
    if (preferences) customer.preferences = { ...customer.preferences, ...preferences };

    await customer.save();

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/customers/password
// @access  Private (customer)
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const customer = await Customer.findById(req.customer._id).select('+password');

    // Vérifier le mot de passe actuel
    const isPasswordValid = await customer.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect',
      });
    }

    // Mettre à jour le mot de passe
    customer.password = newPassword;
    await customer.save();

    res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add address
// @route   POST /api/customers/addresses
// @access  Private (customer)
export const addAddress = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.customer._id);

    // Si c'est la première adresse, la définir par défaut
    const isDefault = customer.addresses.length === 0 || req.body.isDefault;

    // Si nouvelle adresse par défaut, retirer le flag des autres
    if (isDefault) {
      customer.addresses.forEach(addr => addr.isDefault = false);
    }

    customer.addresses.push({
      ...req.body,
      isDefault,
    });

    await customer.save();

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update address
// @route   PUT /api/customers/addresses/:addressId
// @access  Private (customer)
export const updateAddress = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    const address = customer.addresses.id(req.params.addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adresse non trouvée',
      });
    }

    Object.assign(address, req.body);
    await customer.save();

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete address
// @route   DELETE /api/customers/addresses/:addressId
// @access  Private (customer)
export const deleteAddress = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    customer.addresses.id(req.params.addressId).remove();
    await customer.save();

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set default address
// @route   PUT /api/customers/addresses/:addressId/default
// @access  Private (customer)
export const setDefaultAddress = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.customer._id);

    // Retirer le flag de toutes les adresses
    customer.addresses.forEach(addr => addr.isDefault = false);

    // Définir la nouvelle adresse par défaut
    const address = customer.addresses.id(req.params.addressId);
    if (address) {
      address.isDefault = true;
    }

    await customer.save();

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer orders
// @route   GET /api/customers/orders
// @access  Private (customer)
export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      'customer.email': req.customer.email,
      site: req.customer.site,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login
// @route   POST /api/customers/google
// @access  Public
export const googleLogin = async (req, res, next) => {
  try {
    const { credential, siteId } = req.body;

    if (!credential || !siteId) {
      return res.status(400).json({
        success: false,
        message: 'Token Google et siteId requis',
      });
    }

    // Récupérer la config Google OAuth du site
    const site = await Site.findById(siteId).select('+googleOAuthConfig.clientSecret');
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé',
      });
    }

    if (!site.googleOAuthConfig?.enabled || !site.googleOAuthConfig?.clientId) {
      return res.status(400).json({
        success: false,
        message: 'Google OAuth non configuré pour ce site',
      });
    }

    // Vérifier le token Google avec le Client ID du site
    const client = new OAuth2Client(site.googleOAuthConfig.clientId);
    
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: site.googleOAuthConfig.clientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token Google invalide',
      });
    }

    const { email, given_name, family_name, picture } = payload;

    // Chercher le customer par email (peut exister sur un autre site)
    let customer = await Customer.findOne({ email });

    if (!customer) {
      // Créer un nouveau customer
      customer = await Customer.create({
        site: siteId,
        email,
        firstName: given_name || 'Utilisateur',
        lastName: family_name || 'Google',
        password: Math.random().toString(36).slice(-12), // Password aléatoire (non utilisé)
        isVerified: true, // Google vérifie l'email
      });
    } else {
      // Customer existe déjà (peut-être d'un autre site), on le réutilise
      // Optionnel: mettre à jour le site si nécessaire
      logger.info(`🔄 Customer ${email} existe déjà, connexion cross-site autorisée`);
    }

    // Vérifier si le compte est actif
    if (!customer.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été désactivé',
      });
    }

    // Mettre à jour lastLogin
    customer.lastLogin = new Date();
    await customer.save();

    // Générer token
    const token = generateToken(customer._id);

    res.json({
      success: true,
      data: {
        _id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        addresses: customer.addresses,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
