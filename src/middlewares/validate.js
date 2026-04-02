import Joi from 'joi';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_TYPES } from '../config/constants.js';

/**
 * Validation middleware - validate request using Joi schemas
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} - Middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(
        errorMessage,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_TYPES.VALIDATION_ERROR
      ));
    }

    // Replace validated value
    req[property] = value;
    next();
  };
};

export default validate;