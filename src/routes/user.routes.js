import express from 'express';
const router = express.Router();

// Import controllers
import userController from '../controllers/user.controller.js';

// Import validators
import { updateUserSchema, userIdParamSchema, paginationQuerySchema } from '../validators/user.validator.js';

// Import middlewares
import validate from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/permission.middleware.js';

// All user routes require authentication
router.use(authenticate);

// Admin only routes
//  authorize('users', 'read')
router.get('/', authorize('users', 'read'), validate(paginationQuerySchema, 'query'), userController.getAllUsers);
router.get('/:id', authorize('users', 'read'), validate(userIdParamSchema, 'params'), userController.getUserById);
router.put('/:id', authorize('users', 'update'), validate(userIdParamSchema, 'params'), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authorize('users', 'delete'), validate(userIdParamSchema, 'params'), userController.deleteUser);
// Assign/change role for a user (expecting { roleId })
router.patch('/:id/role', authorize('users', 'update'), validate(userIdParamSchema, 'params'), userController.assignRole);

export default router;