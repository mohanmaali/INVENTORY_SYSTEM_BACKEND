import mongoose from 'mongoose';

const ORDER_TYPES = ['purchase', 'sale'];
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Item quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative']
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  }
}, { _id: false });

const orderTimelineSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ORDER_STATUSES,
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  changedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
    trim: true
  },
  type: {
    type: String,
    enum: ORDER_TYPES,
    required: true
  },
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: 'pending'
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: items => Array.isArray(items) && items.length > 0,
      message: 'Order items must contain at least one line item'
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  stockMoved: {
    type: Boolean,
    default: false
  },
  balanceApplied: {
    type: Boolean,
    default: false
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  statusHistory: {
    type: [orderTimelineSchema],
    default: []
  }
}, {
  timestamps: true
});

orderSchema.pre('validate', function(next) {
  if (this.type === 'purchase') {
    this.customerId = null;
  }

  if (this.type === 'sale') {
    this.supplier = null;
  }

  next();
});

orderSchema.path('supplier').validate(function(value) {
  if (this.type === 'purchase') {
    return Boolean(value);
  }
  return true;
}, 'Supplier is required for purchase orders');

orderSchema.path('customerId').validate(function(value) {
  if (this.type === 'sale') {
    return Boolean(value);
  }
  return true;
}, 'Customer is required for sale orders');

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ type: 1, status: 1, createdAt: -1 });
orderSchema.index({ supplier: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });

export { ORDER_STATUSES, ORDER_TYPES };
export default mongoose.model('Order', orderSchema);
