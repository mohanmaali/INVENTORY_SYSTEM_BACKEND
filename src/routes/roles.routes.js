import express from 'express';
const router = express.Router();

import rolesController from '../controllers/roles.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/permission.middleware.js';
import validate from '../middlewares/validate.js';
import { createRoleSchema, updateRoleSchema, roleIdParamSchema } from '../validators/role.validator.js';

// All role-management routes require authentication
router.use(authenticate);

// Admins (or roles with roles:create) can create roles
router.post('/', authorize('roles','create'), validate(createRoleSchema), rolesController.createRole);
router.get('/', authorize('roles', 'read'), rolesController.getAllRoles);
router.get('/:id', authorize('roles','read'), validate(roleIdParamSchema, 'params'), rolesController.getRoleById);
router.patch('/:id', authorize('roles', 'update'), validate(roleIdParamSchema, 'params'), validate(updateRoleSchema), rolesController.updateRole);
router.delete('/:id', authorize('roles', 'delete'), validate(roleIdParamSchema, 'params'), rolesController.deleteRole);

export default router;
