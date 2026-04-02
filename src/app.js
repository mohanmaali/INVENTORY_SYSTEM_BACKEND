import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Import config
import config from './config/env.js';
import logger from './config/logger.js';

// Import middlewares
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';
import notFound from './middlewares/notFound.js';
import rateLimiter from './middlewares/rateLimiter.js';

// Import routes
import routes from './routes/index.js';

// Create Express app
const app = express();

// Security middlewares
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));

// Body parser - limit to prevent large payloads
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Rate limiting
app.use(rateLimiter.generalLimiter);

// Request logging
if (config.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// Mount API routes
app.use('/api', routes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the API',
    version: '1.0.0'
  });
});

// Favicon handler - prevent 404 for favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;