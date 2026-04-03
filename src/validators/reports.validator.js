import Joi from 'joi';

const objectId = Joi.string().hex().length(24);
const groupBy = Joi.string().valid('day', 'week', 'month').default('day');

export const inventoryReportQuerySchema = Joi.object({
  category: Joi.string().trim().allow('', null).optional(),
  supplierId: objectId.optional(),
});

export const stockAlertReportQuerySchema = Joi.object({
  category: Joi.string().trim().allow('', null).optional(),
  supplierId: objectId.optional(),
});

export const salesReportQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  customerId: objectId.optional(),
  groupBy,
});

export const purchasesReportQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  supplierId: objectId.optional(),
  groupBy,
});
