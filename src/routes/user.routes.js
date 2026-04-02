import express from 'express';
const router = express.Router();

// Import controllers
import userController from '../controllers/user.controller.js';

// Import validators
import { updateUserSchema, userIdParamSchema, paginationQuerySchema } from '../validators/user.validator.js';

// Import middlewares
import validate from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

// All user routes require authentication
router.use(authenticate);

// Admin only routes
router.get('/', authorize('admin'), validate(paginationQuerySchema, 'query'), userController.getAllUsers);
router.get('/:id', authorize('admin'), validate(userIdParamSchema, 'params'), userController.getUserById);
router.put('/:id', authorize('admin'), validate(userIdParamSchema, 'params'), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authorize('admin'), validate(userIdParamSchema, 'params'), userController.deleteUser);

export default router;