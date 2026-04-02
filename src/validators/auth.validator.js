import Joi from 'joi';
import { PATTERNS, PAGINATION } from '../config/constants.js';

/**
 * Validation schemas for authentication routes
 */
const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string()
    .pattern(PATTERNS.EMAIL)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .pattern(PATTERNS.PASSWORD)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number',
      'any.required': 'Password is required'
    }),
  // Role is managed via role-management endpoints; new users receive default role via seeder or admin
});

const loginSchema = Joi.object({
  email: Joi.string()
    .pattern(PATTERNS.EMAIL)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .pattern(PATTERNS.EMAIL)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid email',
      'any.required': 'Email is required'
    })
});

const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .pattern(PATTERNS.PASSWORD)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number',
      'any.required': 'Password is required'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required'
    })
});

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .pattern(PATTERNS.PASSWORD)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number',
      'any.required': 'New password is required'
    })
});

const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters'
    }),
  avatar: Joi.string().uri().allow('').messages({
    'string.uri': 'Avatar must be a valid URL'
  })
});

export {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateProfileSchema
};