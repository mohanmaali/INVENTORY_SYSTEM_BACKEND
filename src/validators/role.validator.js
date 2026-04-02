import Joi from 'joi';

export const roleIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

const permissionSchema = Joi.object({
  module: Joi.string().required(),
  actions: Joi.array().items(Joi.string().valid('create','read','update','delete')).required()
});

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(255).allow('', null),
  permissions: Joi.array().items(permissionSchema).required()
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  description: Joi.string().max(255).allow('', null),
  permissions: Joi.array().items(permissionSchema)
});
