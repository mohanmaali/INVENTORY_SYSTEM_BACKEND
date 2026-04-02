import { HTTP_STATUS, ERROR_TYPES } from '../config/constants.js';
import AppError from '../utils/AppError.js';

/**
 * Handle undefined routes (404)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  const error = new AppError(
    `Cannot find ${req.originalUrl} on this server`,
    HTTP_STATUS.NOT_FOUND,
    ERROR_TYPES.NOT_FOUND_ERROR
  );
  next(error);
};

export default notFound;