import Joi from 'joi';

const PRODUCT_STATUSES = ['active', 'inactive', 'discontinued'];
const STOCK_MUTATION_TYPES = ['restock', 'adjustment', 'return'];
const SKU_REGEX = /^[A-Z0-9_-]+$/;

export const productIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null).optional(),
  category: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid(...PRODUCT_STATUSES).optional(),
  supplier: Joi.string().hex().length(24).optional(),
  sort: Joi.string().trim().optional()
});

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  sku: Joi.string().trim().uppercase().pattern(SKU_REGEX).optional(),
  price: Joi.number().integer().min(0).required(),
  quantity: Joi.number().integer().min(0).required(),
  supplier: Joi.string().hex().length(24).required(),
  category: Joi.string().trim().min(2).max(80).required(),
  unit: Joi.string().trim().max(20).allow('', null).optional(),
  lowStockThreshold: Joi.number().integer().min(0).default(10),
  status: Joi.string().valid(...PRODUCT_STATUSES).default('active')
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  price: Joi.number().integer().min(0),
  supplier: Joi.string().hex().length(24),
  category: Joi.string().trim().min(2).max(80),
  unit: Joi.string().trim().max(20).allow('', null),
  lowStockThreshold: Joi.number().integer().min(0),
  status: Joi.string().valid(...PRODUCT_STATUSES),
  sku: Joi.forbidden().messages({ 'any.unknown': 'SKU cannot be updated once created' }),
  quantity: Joi.forbidden().messages({ 'any.unknown': 'Quantity must be updated using stock endpoints only' })
}).min(1);

export const stockAdjustmentSchema = Joi.object({
  type: Joi.string().valid(...STOCK_MUTATION_TYPES).required(),
  delta: Joi.number().integer().required().invalid(0),
  note: Joi.string().trim().max(255).allow('', null).optional()
}).custom((value, helpers) => {
  if ((value.type === 'restock' || value.type === 'return') && value.delta < 0) {
    return helpers.error('any.invalid', { message: `${value.type} delta must be greater than 0` });
  }
  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

export const stockHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const permanentDeleteProductQuerySchema = Joi.object({
  deleteStockLogs: Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0').default(false)
});
