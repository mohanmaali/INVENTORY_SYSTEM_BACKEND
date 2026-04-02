import express from 'express';
const router = express.Router();

// Import route files
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

// Define routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;