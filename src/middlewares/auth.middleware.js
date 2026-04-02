import { HTTP_STATUS, ERROR_TYPES } from '../config/constants.js';
import jwt from '../utils/jwt.js';
import User from '../models/User.model.js';
import AppError from '../utils/AppError.js';

/**
 * Authentication middleware - verify JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError(
        'Not authorized to access this route',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTHENTICATION_ERROR
      ));
    }

    // Verify token
    const decoded = jwt.verifyToken(token);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError(
        'User not found',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTHENTICATION_ERROR
      ));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError(
      'Not authorized to access this route',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_TYPES.AUTHENTICATION_ERROR
    ));
  }
};

/**
 * Authorization middleware - check user roles
 * @param {string[]} ...roles - Allowed roles
 * @returns {Function} - Middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(
        `Role ${req.user.role} is not authorized to access this route`,
        HTTP_STATUS.FORBIDDEN,
        ERROR_TYPES.AUTHORIZATION_ERROR
      ));
    }
    next();
  };
};

export default {
  authenticate,
  authorize
};

export {
  authenticate,
  authorize
};