import { HTTP_STATUS, ERROR_TYPES, MESSAGES } from '../config/constants.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import AppError from '../utils/AppError.js';

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Log error for dev
  if (config.NODE_ENV !== 'production') {
    logger.error(`Error: ${err.message}`, {
      statusCode: error.statusCode,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new AppError(message, HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    const message = messages.join(', ');
    error = new AppError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_TYPES.VALIDATION_ERROR);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token, please login again';
    error = new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_TYPES.AUTHENTICATION_ERROR);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired, please login again';
    error = new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_TYPES.AUTHENTICATION_ERROR);
  }

  res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error.message || MESSAGES.SERVER_ERROR,
    ...(config.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

export default errorHandler;