import Joi from 'joi';

const CUSTOMER_TYPES = ['individual', 'business'];
const CUSTOMER_STATUSES = ['active', 'inactive', 'blacklisted'];

const objectId = Joi.string().hex().length(24);

const addressSchema = Joi.object({
  street: Joi.string().trim().max(255).allow('', null).optional(),
  city: Joi.string().trim().max(100).allow('', null).optional(),
  state: Joi.string().trim().max(100).allow('', null).optional(),
  zipCode: Joi.string().trim().max(20).allow('', null).optional(),
  country: Joi.string().trim().max(100).allow('', null).optional()
});

export const customerIdParamSchema = Joi.object({
  id: objectId.required()
});

export const createCustomerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  type: Joi.string().valid(...CUSTOMER_TYPES).required(),
  email: Joi.string().trim().email().allow('', null).optional(),
  phone: Joi.string().trim().min(10).max(30).required(),
  address: addressSchema.optional(),
  companyName: Joi.string().trim().max(120).allow('', null).optional(),
  taxId: Joi.string().trim().max(60).allow('', null).optional(),
  creditLimit: Joi.number().min(0).default(0),
  status: Joi.string().valid(...CUSTOMER_STATUSES).default('active'),
  notes: Joi.string().trim().max(500).allow('', null).optional()
});

export const updateCustomerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  type: Joi.string().valid(...CUSTOMER_TYPES).optional(),
  email: Joi.string().trim().email().allow('', null).optional(),
  phone: Joi.string().trim().min(10).max(30).optional(),
  address: addressSchema.optional(),
  companyName: Joi.string().trim().max(120).allow('', null).optional(),
  taxId: Joi.string().trim().max(60).allow('', null).optional(),
  creditLimit: Joi.number().min(0).optional(),
  status: Joi.string().valid(...CUSTOMER_STATUSES).optional(),
  notes: Joi.string().trim().max(500).allow('', null).optional(),
  customerCode: Joi.forbidden(),
  outstandingBalance: Joi.forbidden(),
  createdBy: Joi.forbidden()
}).min(1);

export const customerQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null).optional(),
  type: Joi.string().valid(...CUSTOMER_TYPES).optional(),
  status: Joi.string().valid(...CUSTOMER_STATUSES).optional()
});

export const customerOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'confirmed', 'processing', 'completed', 'cancelled').optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional()
});
