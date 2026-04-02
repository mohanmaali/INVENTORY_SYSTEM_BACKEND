import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @param {Object} meta - Pagination metadata
 * @returns {Object} - JSON response
 */
const successResponse = (res, statusCode = HTTP_STATUS.OK, message = MESSAGES.SUCCESS, data = null, meta = null) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {any} errors - Additional error details
 * @returns {Object} - JSON response
 */
const errorResponse = (res, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = MESSAGES.SERVER_ERROR, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @returns {Object} - JSON response
 */
const createdResponse = (res, message = MESSAGES.SUCCESS, data = null) => {
  return successResponse(res, HTTP_STATUS.CREATED, message, data);
};

/**
 * Send no content response (204)
 * @param {Object} res - Express response object
 * @returns {Object} - Empty response
 */
const noContentResponse = (res) => {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

export default {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse
};