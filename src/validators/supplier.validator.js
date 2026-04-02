import Joi from 'joi';

export const supplierIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

export const supplierQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow('', null).optional(),
  name: Joi.string().trim().allow('', null).optional(),
  contact: Joi.string().trim().allow('', null).optional(),
  sort: Joi.string().trim().optional()
});

export const createSupplierSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  contact: Joi.string().trim().min(10).max(20).required(),
  email: Joi.string().trim().email().required(),
  address: Joi.string().trim().min(3).max(255).required()
});

export const updateSupplierSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  contact: Joi.string().trim().min(10).max(20),
  email: Joi.string().trim().email(),
  address: Joi.string().trim().min(3).max(255)
}).min(1);
