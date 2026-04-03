import express from 'express';

import customerController from '../controllers/customer.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/permission.middleware.js';
import validate from '../middlewares/validate.js';
import {
  createCustomerSchema,
  customerIdParamSchema,
  customerOrdersQuerySchema,
  customerQuerySchema,
  updateCustomerSchema
} from '../validators/customer.validator.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('customers', 'create'), validate(createCustomerSchema), customerController.createCustomer);
router.get('/', authorize('customers', 'read'), validate(customerQuerySchema, 'query'), customerController.getAllCustomers);
router.get('/:id/orders', authorize('customers', 'read'), validate(customerIdParamSchema, 'params'), validate(customerOrdersQuerySchema, 'query'), customerController.getCustomerOrders);
router.get('/:id/summary', authorize('customers', 'read'), validate(customerIdParamSchema, 'params'), customerController.getCustomerSummary);
router.get('/:id', authorize('customers', 'read'), validate(customerIdParamSchema, 'params'), customerController.getCustomerById);
router.patch('/:id', authorize('customers', 'update'), validate(customerIdParamSchema, 'params'), validate(updateCustomerSchema), customerController.updateCustomer);
router.delete('/:id/permanent', authorize('customers', 'delete'), validate(customerIdParamSchema, 'params'), customerController.permanentlyDeleteCustomer);
router.delete('/:id', authorize('customers', 'delete'), validate(customerIdParamSchema, 'params'), customerController.deleteCustomer);

export default router;
