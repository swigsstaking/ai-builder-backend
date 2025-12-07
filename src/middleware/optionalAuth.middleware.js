import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware d'authentification optionnelle
 * Si un token est présent, on charge l'utilisateur dans req.user
 * Sinon, on continue sans req.user (pour les appels publics comme le monitoring)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Si pas de token, continuer sans authentification
    if (!token) {
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's a service token
      if (decoded.id && decoded.id.startsWith('service-')) {
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

      // Regular user token - get user from DB
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user || !req.user.isActive) {
        // Token invalide ou utilisateur inactif, continuer sans auth
        req.user = undefined;
      }

      next();
    } catch (error) {
      // Token invalide, continuer sans auth
      req.user = undefined;
      next();
    }
  } catch (error) {
    next(error);
  }
};
