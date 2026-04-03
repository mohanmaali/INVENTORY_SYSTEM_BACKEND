import express from 'express';

import ordersController from '../controllers/orders.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/permission.middleware.js';
import validate from '../middlewares/validate.js';
import {
  createOrderSchema,
  orderIdParamSchema,
  orderQuerySchema,
  orderSummaryQuerySchema,
  updateOrderSchema,
  updateOrderStatusSchema
} from '../validators/orders.validator.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', authorize('orders', 'read'), validate(orderSummaryQuerySchema, 'query'), ordersController.getOrdersSummary);
router.get('/', authorize('orders', 'read'), validate(orderQuerySchema, 'query'), ordersController.getAllOrders);
router.get('/:id/timeline', authorize('orders', 'read'), validate(orderIdParamSchema, 'params'), ordersController.getOrderTimeline);
router.get('/:id', authorize('orders', 'read'), validate(orderIdParamSchema, 'params'), ordersController.getOrderById);
router.post('/', authorize('orders', 'create'), validate(createOrderSchema), ordersController.createOrder);
router.patch('/:id', authorize('orders', 'update'), validate(orderIdParamSchema, 'params'), validate(updateOrderSchema), ordersController.updateOrder);
router.patch('/:id/status', authorize('orders', 'update'), validate(orderIdParamSchema, 'params'), validate(updateOrderStatusSchema), ordersController.updateOrderStatus);
router.delete('/:id/permanent', authorize('orders', 'delete'), validate(orderIdParamSchema, 'params'), ordersController.permanentlyDeleteOrder);
router.delete('/:id', authorize('orders', 'delete'), validate(orderIdParamSchema, 'params'), ordersController.deleteOrder);

export default router;
