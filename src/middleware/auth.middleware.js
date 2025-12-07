import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Customer from '../models/Customer.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's a service token (doesn't exist in DB)
      if (decoded.id && decoded.id.startsWith('service-')) {
        // Service token - create a virtual user object
        req.user = {
          _id: decoded.id,
          email: decoded.email,
          role: decoded.role || 'admin',
          name: decoded.name,
          isActive: true,
          isServiceAccount: true,
        };
        return next();
      }

      // Handle different user types
      if (decoded.type === 'customer') {
        // It's a customer
        const customer = await Customer.findById(decoded.id).select('-password');
        if (customer) {
          req.user = customer;
          // Ensure role property exists for authorization checks
          if (!req.user.role) req.user.role = 'customer';
        }
      } else {
        // It's a regular user (admin/editor)
        req.user = await User.findById(decoded.id).select('-password');
        
        // Fallback: if not found in Users, try Customers (for backward compatibility or if type is missing)
        if (!req.user) {
          const customer = await Customer.findById(decoded.id).select('-password');
          if (customer) {
            req.user = customer;
            if (!req.user.role) req.user.role = 'customer';
          }
        }
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is inactive',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    // Superadmin a accès à tout
    if (req.user.role === 'superadmin') {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      console.warn(`⚠️  Non-authorized ${req.user.email} (${req.user.role}) trying to access route requiring: ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
