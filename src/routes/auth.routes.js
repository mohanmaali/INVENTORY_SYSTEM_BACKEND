import express from 'express';
const router = express.Router();

// Import controllers
import authController from '../controllers/auth.controller.js';

// Import validators
import { registerSchema, loginSchema, updateProfileSchema, updatePasswordSchema } from '../validators/auth.validator.js';

// Import middlewares
import validate from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import rateLimiter from '../middlewares/rateLimiter.js';

// Public routes (with rate limiting)
router.post('/register', rateLimiter.authLimiter, validate(registerSchema), authController.register);
router.post('/login', rateLimiter.authLimiter, validate(loginSchema), authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.put('/change-password', authenticate, validate(updatePasswordSchema), authController.changePassword);

export default router;