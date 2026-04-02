import mongoose from 'mongoose';
import config from './env.js';
import logger from './logger.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB Disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB Error: ${err.message}`);
});

export default connectDB;