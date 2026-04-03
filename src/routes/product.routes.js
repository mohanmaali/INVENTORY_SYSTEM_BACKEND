import express from 'express';

import productController from '../controllers/product.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/permission.middleware.js';
import validate from '../middlewares/validate.js';
import {
  createProductSchema,
  permanentDeleteProductQuerySchema,
  productIdParamSchema,
  productQuerySchema,
  stockAdjustmentSchema,
  stockHistoryQuerySchema,
  updateProductSchema
} from '../validators/product.validator.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('products', 'create'), validate(createProductSchema), productController.createProduct);
router.get('/', authorize('products', 'read'), validate(productQuerySchema, 'query'), productController.getAllProducts);
router.get('/:id', authorize('products', 'read'), validate(productIdParamSchema, 'params'), productController.getProductById);
router.patch('/:id', authorize('products', 'update'), validate(productIdParamSchema, 'params'), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authorize('products', 'delete'), validate(productIdParamSchema, 'params'), productController.deleteProduct);
router.delete('/:id/permanent', authorize('products', 'delete'), validate(productIdParamSchema, 'params'), validate(permanentDeleteProductQuerySchema, 'query'), productController.permanentlyDeleteProduct);
router.patch('/:id/stock', authorize('products', 'update'), validate(productIdParamSchema, 'params'), validate(stockAdjustmentSchema), productController.adjustStock);
router.get('/:id/stock/history', authorize('products', 'read'), validate(productIdParamSchema, 'params'), validate(stockHistoryQuerySchema, 'query'), productController.getStockHistory);

export default router;
