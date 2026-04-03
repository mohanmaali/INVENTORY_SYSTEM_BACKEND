import express from 'express';

import reportsController from '../controllers/reports.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/permission.middleware.js';
import validate from '../middlewares/validate.js';
import {
  inventoryReportQuerySchema,
  purchasesReportQuerySchema,
  salesReportQuerySchema,
  stockAlertReportQuerySchema,
} from '../validators/reports.validator.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('reports', 'read'));

router.get('/inventory', validate(inventoryReportQuerySchema, 'query'), reportsController.getInventoryReport);
router.get('/low-stock', validate(stockAlertReportQuerySchema, 'query'), reportsController.getLowStockReport);
router.get('/out-of-stock', validate(stockAlertReportQuerySchema, 'query'), reportsController.getOutOfStockReport);
router.get('/sales', validate(salesReportQuerySchema, 'query'), reportsController.getSalesReport);
router.get('/purchases', validate(purchasesReportQuerySchema, 'query'), reportsController.getPurchasesReport);
router.get('/dashboard', reportsController.getDashboardReport);

export default router;
