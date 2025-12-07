import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Site from '../models/Site.js';
import logger from '../utils/logger.js';
import analyticsService from '../services/analytics.service.js';

// Vue d'ensemble (overview)
export const getOverview = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId, dateFrom, dateTo } = req.query;
    
    // Construire le filtre de base
    let query = {};
    
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    // Filtre de dates
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // CA total (filtrer par payment.status = 'paid' OU status = 'paid')
    const totalRevenue = await Order.aggregate([
      { 
        $match: { 
          ...query, 
          $or: [
            { 'payment.status': 'paid' },
            { status: 'paid' }
          ]
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    
    // CA aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenue = await Order.aggregate([
      { 
        $match: { 
          ...query, 
          $or: [
            { 'payment.status': 'paid' },
            { status: 'paid' }
          ],
          createdAt: { $gte: today },
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    
    // CA ce mois
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthRevenue = await Order.aggregate([
      { 
        $match: { 
          ...query, 
          $or: [
            { 'payment.status': 'paid' },
            { status: 'paid' }
          ],
          createdAt: { $gte: firstDayOfMonth },
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    
    // Nombre de commandes (payées)
    const ordersCount = await Order.countDocuments({
      ...query,
      $or: [
        { 'payment.status': 'paid' },
        { status: 'paid' }
      ],
    });
    
    // Panier moyen
    const avgOrderValue = totalRevenue[0]?.total && ordersCount > 0
      ? totalRevenue[0].total / ordersCount
      : 0;
    
    // Clients récurrents (>1 commande)
    const customersQuery = user.role === 'editor' 
      ? { site: { $in: user.sites } }
      : siteId ? { site: siteId } : {};
    
    const totalCustomers = await Customer.countDocuments(customersQuery);
    
    const recurringCustomers = await Order.aggregate([
      { $match: { ...query, status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: '$customer.email', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'total' },
    ]);
    
    const recurringRate = totalCustomers > 0 && recurringCustomers[0]?.total
      ? (recurringCustomers[0].total / totalCustomers) * 100
      : 0;
    
    // Top 5 produits (utiliser payment.status = 'paid' comme pour totalRevenue)
    const topProducts = await Order.aggregate([
      { 
        $match: { 
          ...query, 
          $or: [
            { 'payment.status': 'paid' },
            { status: 'paid' }
          ]
        } 
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          image: { $first: '$items.productImage' },
          sales: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
        },
      },
      { $sort: { sales: -1 } },
      { $limit: 5 },
    ]);
    
    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        monthRevenue: monthRevenue[0]?.total || 0,
        ordersCount,
        avgOrderValue,
        totalCustomers,
        recurringCustomersCount: recurringCustomers[0]?.total || 0,
        recurringRate,
        topProducts,
      },
    });
  } catch (error) {
    logger.error('Error getting analytics overview:', error);
    next(error);
  }
};

// Données de ventes (graphique)
export const getSalesData = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId, period = '30days' } = req.query;
    
    let query = {};
    
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    // Calculer la date de début selon la période
    const now = new Date();
    let startDate = new Date();
    let groupFormat = '%Y-%m-%d';
    
    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '12months':
        startDate.setMonth(now.getMonth() - 12);
        groupFormat = '%Y-%m';
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    query.createdAt = { $gte: startDate };
    query.status = { $in: ['paid', 'processing', 'shipped', 'delivered'] };
    
    const salesData = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    res.json({
      success: true,
      data: salesData,
    });
  } catch (error) {
    logger.error('Error getting sales data:', error);
    next(error);
  }
};

// Top produits
export const getTopProducts = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId, limit = 10, sortBy = 'revenue' } = req.query;
    
    let query = {};
    
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    query.status = { $in: ['paid', 'processing', 'shipped', 'delivered'] };
    
    const sortField = sortBy === 'quantity' ? 'totalQuantity' : 'totalRevenue';
    
    const topProducts = await Order.aggregate([
      { $match: query },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          productImage: { $first: '$items.productImage' },
          totalRevenue: { $sum: '$items.total' },
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { [sortField]: -1 } },
      { $limit: parseInt(limit) },
    ]);
    
    res.json({
      success: true,
      data: topProducts,
    });
  } catch (error) {
    logger.error('Error getting top products:', error);
    next(error);
  }
};

// Statistiques clients
export const getCustomerStats = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId } = req.query;
    
    let query = {};
    
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    // Nouveaux clients ce mois
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const newCustomersThisMonth = await Customer.countDocuments({
      ...query,
      createdAt: { $gte: firstDayOfMonth },
    });
    
    // Total clients
    const totalCustomers = await Customer.countDocuments(query);
    
    // Clients avec commandes
    const customersWithOrders = await Order.aggregate([
      { $match: { ...query, status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: '$customer.email' } },
      { $count: 'total' },
    ]);
    
    // Clients récurrents
    const recurringCustomers = await Order.aggregate([
      { $match: { ...query, status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: '$customer.email', orderCount: { $sum: 1 } } },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: 'total' },
    ]);
    
    const retentionRate = customersWithOrders[0]?.total > 0 && recurringCustomers[0]?.total
      ? (recurringCustomers[0].total / customersWithOrders[0].total) * 100
      : 0;
    
    res.json({
      success: true,
      data: {
        totalCustomers,
        newCustomersThisMonth,
        customersWithOrders: customersWithOrders[0]?.total || 0,
        recurringCustomers: recurringCustomers[0]?.total || 0,
        retentionRate,
      },
    });
  } catch (error) {
    logger.error('Error getting customer stats:', error);
    next(error);
  }
};

// Statistiques commandes
export const getOrderStats = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId } = req.query;
    
    let query = {};
    
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    // Répartition par statut
    const ordersByStatus = await Order.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    
    // Panier moyen
    const avgOrder = await Order.aggregate([
      { $match: { ...query, status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: null, avg: { $avg: '$total' } } },
    ]);
    
    res.json({
      success: true,
      data: {
        ordersByStatus,
        avgOrderValue: avgOrder[0]?.avg || 0,
      },
    });
  } catch (error) {
    logger.error('Error getting order stats:', error);
    next(error);
  }
};

// Export CSV
export const exportData = async (req, res, next) => {
  try {
    const user = req.user;
    const { siteId, type = 'orders', dateFrom, dateTo } = req.query;
    
    let query = {};
    
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    let data = [];
    let headers = [];
    
    if (type === 'orders') {
      const orders = await Order.find(query)
        .populate('site', 'name')
        .sort({ createdAt: -1 });
      
      headers = ['Numéro', 'Date', 'Client', 'Email', 'Total', 'Statut', 'Site'];
      
      data = orders.map(order => [
        order.orderNumber,
        new Date(order.createdAt).toLocaleDateString('fr-FR'),
        `${order.customer.firstName} ${order.customer.lastName}`,
        order.customer.email,
        order.total.toFixed(2),
        order.status,
        order.site?.name || '',
      ]);
    } else if (type === 'customers') {
      const customers = await Customer.find(query)
        .populate('site', 'name')
        .sort({ createdAt: -1 });
      
      headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Date inscription', 'Site'];
      
      data = customers.map(customer => [
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phone || '',
        new Date(customer.createdAt).toLocaleDateString('fr-FR'),
        customer.site?.name || '',
      ]);
    }
    
    // Générer CSV
    const csv = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-${Date.now()}.csv"`);
    res.send('\uFEFF' + csv); // BOM pour Excel
  } catch (error) {
    logger.error('Error exporting data:', error);
    next(error);
  }
};

// ============================================
// GOOGLE ANALYTICS 4
// ============================================

/**
 * Vue d'ensemble GA4
 * GET /api/analytics/ga4/overview?siteId=xxx&days=30
 */
export const getGA4Overview = async (req, res, next) => {
  try {
    const { siteId, days = 30 } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId requis',
      });
    }
    
    // Récupérer le site pour obtenir le GA4 Property ID
    const site = await Site.findById(siteId);
    if (!site || !site.settings?.analytics?.ga4PropertyId) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé ou GA4 non configuré',
      });
    }
    
    const data = await analyticsService.getOverview(site.settings.analytics.ga4PropertyId, parseInt(days));
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting GA4 overview:', error);
    next(error);
  }
};

/**
 * Historique du trafic GA4
 * GET /api/analytics/ga4/traffic?siteId=xxx&days=30
 */
export const getGA4Traffic = async (req, res, next) => {
  try {
    const { siteId, days = 30 } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId requis',
      });
    }
    
    const site = await Site.findById(siteId);
    if (!site || !site.settings?.analytics?.ga4PropertyId) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé ou GA4 non configuré',
      });
    }
    
    const data = await analyticsService.getTrafficHistory(site.settings.analytics.ga4PropertyId, parseInt(days));
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting GA4 traffic:', error);
    next(error);
  }
};

/**
 * Sources de trafic GA4
 * GET /api/analytics/ga4/sources?siteId=xxx&days=30
 */
export const getGA4Sources = async (req, res, next) => {
  try {
    const { siteId, days = 30 } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId requis',
      });
    }
    
    const site = await Site.findById(siteId);
    if (!site || !site.settings?.analytics?.ga4PropertyId) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé ou GA4 non configuré',
      });
    }
    
    const data = await analyticsService.getTrafficSources(site.settings.analytics.ga4PropertyId, parseInt(days));
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting GA4 sources:', error);
    next(error);
  }
};

/**
 * Pages les plus vues GA4
 * GET /api/analytics/ga4/pages?siteId=xxx&days=30&limit=10
 */
export const getGA4TopPages = async (req, res, next) => {
  try {
    const { siteId, days = 30, limit = 10 } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId requis',
      });
    }
    
    const site = await Site.findById(siteId);
    if (!site || !site.settings?.analytics?.ga4PropertyId) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé ou GA4 non configuré',
      });
    }
    
    const data = await analyticsService.getTopPages(site.settings.analytics.ga4PropertyId, parseInt(days), parseInt(limit));
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting GA4 top pages:', error);
    next(error);
  }
};

/**
 * Appareils utilisés GA4
 * GET /api/analytics/ga4/devices?siteId=xxx&days=30
 */
export const getGA4Devices = async (req, res, next) => {
  try {
    const { siteId, days = 30 } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId requis',
      });
    }
    
    const site = await Site.findById(siteId);
    if (!site || !site.settings?.analytics?.ga4PropertyId) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé ou GA4 non configuré',
      });
    }
    
    const data = await analyticsService.getDevices(site.settings.analytics.ga4PropertyId, parseInt(days));
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting GA4 devices:', error);
    next(error);
  }
};

/**
 * Comparaison avec période précédente GA4
 * GET /api/analytics/ga4/comparison?siteId=xxx&days=30
 */
export const getGA4Comparison = async (req, res, next) => {
  try {
    const { siteId, days = 30 } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'siteId requis',
      });
    }
    
    const site = await Site.findById(siteId);
    if (!site || !site.settings?.analytics?.ga4PropertyId) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé ou GA4 non configuré',
      });
    }
    
    const data = await analyticsService.getComparison(site.settings.analytics.ga4PropertyId, parseInt(days));
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error getting GA4 comparison:', error);
    next(error);
  }
};
