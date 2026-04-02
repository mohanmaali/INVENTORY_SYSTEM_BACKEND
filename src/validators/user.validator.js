import Joi from 'joi';
import { PATTERNS, PAGINATION } from '../config/constants.js';

/**
 * Validation schemas for user routes
 */
const updateUserSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters'
    }),
  email: Joi.string()
    .pattern(PATTERNS.EMAIL)
    .messages({
      'string.pattern.base': 'Please provide a valid email'
    }),
  // Role should be managed via roleId and role-management endpoints; not set directly here
  isActive: Joi.boolean()
});

const userIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid user ID format'
    })
});

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: Joi.number().integer().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  search: Joi.string().allow(''),
  sort: Joi.string().default('-createdAt'),
  fields: Joi.string()
});

export {
  updateUserSchema,
  userIdParamSchema,
  paginationQuerySchema
};