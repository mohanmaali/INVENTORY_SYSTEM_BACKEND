import Joi from 'joi';

const ORDER_TYPES = ['purchase', 'sale'];
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];

const objectId = Joi.string().hex().length(24);

const customerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  contact: Joi.string().trim().max(30).allow('', null).optional(),
  email: Joi.string().trim().email().allow('', null).optional(),
  address: Joi.string().trim().max(255).allow('', null).optional()
});

const orderItemSchema = Joi.object({
  product: objectId.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).optional()
});

export const orderIdParamSchema = Joi.object({
  id: objectId.required()
});

export const createOrderSchema = Joi.object({
  type: Joi.string().valid(...ORDER_TYPES).required(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  supplier: objectId.allow(null).optional(),
  customerId: objectId.allow(null).optional(),
  note: Joi.string().trim().max(500).allow('', null).optional()
}).custom((value, helpers) => {
  if (value.type === 'purchase' && !value.supplier) {
    return helpers.error('any.invalid', { message: 'Supplier is required for purchase orders' });
  }

  if (value.type === 'sale' && !value.customerId) {
    return helpers.error('any.invalid', { message: 'Customer is required for sale orders' });
  }

  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

export const updateOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).optional(),
  supplier: objectId.allow(null).optional(),
  customerId: objectId.allow(null).optional(),
  note: Joi.string().trim().max(500).allow('', null).optional(),
  type: Joi.forbidden(),
  status: Joi.forbidden(),
  orderNumber: Joi.forbidden(),
  createdBy: Joi.forbidden()
}).min(1).custom((value, helpers) => {
  const hasSupplier = Object.prototype.hasOwnProperty.call(value, 'supplier');
  const hasCustomer = Object.prototype.hasOwnProperty.call(value, 'customerId');

  if (hasSupplier && hasCustomer) {
    return helpers.error('any.invalid', { message: 'Provide either supplier or customer based on order type, not both' });
  }

  return value;
}).messages({
  'any.invalid': '{{#message}}'
});

export const orderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid(...ORDER_TYPES).optional(),
  status: Joi.string().valid(...ORDER_STATUSES).optional(),
  supplier: objectId.optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional()
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'processing', 'completed', 'cancelled').required(),
  note: Joi.string().trim().max(255).allow('', null).optional()
});

export const orderSummaryQuerySchema = Joi.object({
  type: Joi.string().valid(...ORDER_TYPES).optional(),
  status: Joi.string().valid(...ORDER_STATUSES).optional(),
  supplier: objectId.optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional()
});
