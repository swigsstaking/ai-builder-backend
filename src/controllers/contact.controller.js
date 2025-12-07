import Contact from '../models/Contact.js';
import Site from '../models/Site.js';
import { sendContactEmail, sendGiftCardEmail } from '../services/email.service.js';
import logger from '../utils/logger.js';

/**
 * Soumettre un formulaire de contact
 */
export const submitContact = async (req, res, next) => {
  try {
    const { siteId, name, email, phone, message } = req.body;
    
    // Validation
    if (!siteId || !name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Nom, email et message sont requis',
      });
    }
    
    // Récupérer le site
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé',
      });
    }
    
    // Vérifier que l'email de réception est configuré
    if (!site.contact?.formsEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email de réception non configuré pour ce site',
      });
    }
    
    // Créer l'entrée en base
    const contact = await Contact.create({
      site: siteId,
      type: 'contact',
      name,
      email,
      phone,
      message,
    });
    
    // Envoyer l'email
    try {
      await sendContactEmail({
        to: site.contact.formsEmail,
        siteName: site.name,
        name,
        email,
        phone,
        message,
        siteSmtp: site.smtp, // Passer la config SMTP du site
      });
      
      contact.emailSent = true;
      await contact.save();
      
      logger.success(`Contact soumis et email envoyé pour ${site.name}`);
    } catch (emailError) {
      contact.emailError = emailError.message;
      await contact.save();
      
      logger.error(`Email non envoyé pour contact ${contact._id}:`, emailError.message);
      
      // On retourne quand même un succès car le contact est sauvegardé
      return res.status(200).json({
        success: true,
        message: 'Message reçu mais email non envoyé. Nous vous contacterons bientôt.',
        data: { id: contact._id },
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès !',
      data: { id: contact._id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soumettre une demande de bon cadeau
 */
export const submitGiftCard = async (req, res, next) => {
  try {
    const { 
      siteId, 
      name, 
      email, 
      phone, 
      amount, 
      recipientName, 
      recipientEmail, 
      deliveryDate,
      message 
    } = req.body;
    
    // Validation
    if (!siteId || !name || !email || !amount || !recipientName) {
      return res.status(400).json({
        success: false,
        message: 'Nom, email, montant et nom du bénéficiaire sont requis',
      });
    }
    
    // Récupérer le site
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé',
      });
    }
    
    // Vérifier que l'email de réception est configuré
    if (!site.contact?.formsEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email de réception non configuré pour ce site',
      });
    }
    
    // Créer l'entrée en base
    const contact = await Contact.create({
      site: siteId,
      type: 'gift-card',
      name,
      email,
      phone,
      message,
      giftCard: {
        amount,
        recipientName,
        recipientEmail,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      },
    });
    
    // Envoyer l'email
    try {
      await sendGiftCardEmail({
        to: site.contact.formsEmail,
        siteName: site.name,
        name,
        email,
        phone,
        amount,
        recipientName,
        recipientEmail,
        deliveryDate,
        message,
        siteSmtp: site.smtp, // Passer la config SMTP du site
      });
      
      contact.emailSent = true;
      await contact.save();
      
      logger.success(`Bon cadeau soumis et email envoyé pour ${site.name}`);
    } catch (emailError) {
      contact.emailError = emailError.message;
      await contact.save();
      
      logger.error(`Email non envoyé pour bon cadeau ${contact._id}:`, emailError.message);
      
      return res.status(200).json({
        success: true,
        message: 'Demande reçue mais email non envoyé. Nous vous contacterons bientôt.',
        data: { id: contact._id },
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Demande de bon cadeau envoyée avec succès !',
      data: { id: contact._id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer tous les contacts (admin)
 */
export const getContacts = async (req, res, next) => {
  try {
    const { siteId, type, status } = req.query;
    
    const filter = {};
    if (siteId) filter.site = siteId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    const contacts = await Contact.find(filter)
      .populate('site', 'name slug')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mettre à jour le statut d'un contact
 */
export const updateContactStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
      });
    }
    
    const contact = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('site', 'name slug');
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact non trouvé',
      });
    }
    
    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un contact
 */
export const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findByIdAndDelete(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact non trouvé',
      });
    }
    
    res.json({
      success: true,
      message: 'Contact supprimé',
    });
  } catch (error) {
    next(error);
  }
};
