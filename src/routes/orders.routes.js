import express from 'express';
const router = express.Router();

import ordersController from '../controllers/orders.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/permission.middleware.js';
import validate from '../middlewares/validate.js';

// Grouped routes for the `orders` module. Each route is protected using
// `authenticate` (ensures JWT/user present) and `authorize(module, action)`.
router.get('/', authenticate, authorize('orders', 'read'), ordersController.getAllOrders);
router.get('/:id', authenticate, authorize('orders', 'read'), ordersController.getOrderById);
router.post('/', authenticate, authorize('orders', 'create'), validate({}), ordersController.createOrder);
router.put('/:id', authenticate, authorize('orders', 'update'), validate({}), ordersController.updateOrder);
router.delete('/:id', authenticate, authorize('orders', 'delete'), ordersController.deleteOrder);

export default router;
