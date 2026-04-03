import express from 'express';
const router = express.Router();

// Import route files
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import ordersRoutes from './orders.routes.js';
import rolesRoutes from './roles.routes.js';
import supplierRoutes from './supplier.routes.js';
import productRoutes from './product.routes.js';
import customerRoutes from './customer.routes.js';

// Define routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orders', ordersRoutes);
router.use('/roles', rolesRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
