import morgan from 'morgan';
import logger from '../config/logger.js';
import config from '../config/env.js';

// Create stream for Morgan
const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Skip logging in production for certain status codes
const skip = () => {
  return config.NODE_ENV !== 'development';
};

/**
 * Request logger middleware using Morgan
 */
const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream,
    skip
  }
);

export default requestLogger;