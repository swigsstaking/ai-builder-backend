import Customer from '../models/Customer.js';

// @desc    Get all customers (Admin)
// @route   GET /api/customers/admin
// @access  Private (Admin/Editor)
export const getAllCustomers = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const user = req.user;

    let query = {};

    // Si l'utilisateur est un éditeur, filtrer par ses sites
    if (user.role === 'editor') {
      query.site = { $in: user.sites };
    } else if (siteId) {
      query.site = siteId;
    }

    const customers = await Customer.find(query)
      .select('-password')
      .populate('site', 'name slug')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer by ID (Admin)
// @route   GET /api/customers/admin/:id
// @access  Private (Admin/Editor)
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .select('-password')
      .populate('site', 'name slug');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer status (Admin)
// @route   PATCH /api/customers/admin/:id/status
// @access  Private (Admin/Editor)
export const updateCustomerStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};
