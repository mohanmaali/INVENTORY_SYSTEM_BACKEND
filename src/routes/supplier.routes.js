import express from 'express';

import supplierController from '../controllers/supplier.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/permission.middleware.js';
import validate from '../middlewares/validate.js';
import {
  createSupplierSchema,
  supplierIdParamSchema,
  supplierQuerySchema,
  updateSupplierSchema
} from '../validators/supplier.validator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('suppliers', 'read'), validate(supplierQuerySchema, 'query'), supplierController.getAllSuppliers);
router.get('/:id', authorize('suppliers', 'read'), validate(supplierIdParamSchema, 'params'), supplierController.getSupplierById);
router.post('/', authorize('suppliers', 'create'), validate(createSupplierSchema), supplierController.createSupplier);
router.put('/:id', authorize('suppliers', 'update'), validate(supplierIdParamSchema, 'params'), validate(updateSupplierSchema), supplierController.updateSupplier);
router.delete('/:id', authorize('suppliers', 'delete'), validate(supplierIdParamSchema, 'params'), supplierController.deleteSupplier);

export default router;
