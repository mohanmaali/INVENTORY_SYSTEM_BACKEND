import mongoose from 'mongoose';

const STOCK_LOG_TYPES = ['restock', 'sale', 'adjustment', 'return'];

const stockLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: STOCK_LOG_TYPES,
    required: true
  },
  delta: {
    type: Number,
    required: true
  },
  quantityBefore: {
    type: Number,
    required: true,
    min: 0
  },
  quantityAfter: {
    type: Number,
    required: true,
    min: 0
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

stockLogSchema.index({ productId: 1, createdAt: -1 });

export { STOCK_LOG_TYPES };
export default mongoose.model('StockLog', stockLogSchema);
