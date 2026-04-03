import { EventEmitter } from 'events';
import logger from '../config/logger.js';

const inventoryEvents = new EventEmitter();

inventoryEvents.on('low_stock', payload => {
  logger.warn('Low stock detected', payload);
});

export default inventoryEvents;
