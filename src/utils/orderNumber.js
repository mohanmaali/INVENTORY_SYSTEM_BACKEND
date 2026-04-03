import Order from '../models/Order.model.js';

const ORDER_PREFIX = {
  purchase: 'PO',
  sale: 'SO'
};

const padSequence = value => String(value).padStart(4, '0');

const buildDateToken = date => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const generateOrderNumber = async (type, options = {}) => {
  const prefix = ORDER_PREFIX[type];
  if (!prefix) {
    throw new Error(`Unsupported order type: ${type}`);
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const dateToken = buildDateToken(now);
  const basePrefix = `${prefix}-${dateToken}-`;

  const latestOrder = await Order.findOne({
    orderNumber: { $regex: `^${basePrefix}` }
  })
    .sort({ orderNumber: -1 })
    .select('orderNumber')
    .session(options.session || null)
    .lean();

  let sequence = 1;
  if (latestOrder?.orderNumber) {
    const parts = latestOrder.orderNumber.split('-');
    sequence = Number(parts[2]) + 1;
  }

  return `${basePrefix}${padSequence(sequence)}`;
};

export default {
  generateOrderNumber
};
