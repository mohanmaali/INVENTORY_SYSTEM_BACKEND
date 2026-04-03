import mongoose from 'mongoose';

const PRODUCT_STATUSES = ['active', 'inactive', 'discontinued'];

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [120, 'Product name cannot exceed 120 characters']
  },
  nameKey: {
    type: String,
    required: true,
    select: false
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    trim: true,
    uppercase: true,
    immutable: true,
    match: [/^[A-Z0-9_-]+$/, 'SKU must contain only letters, numbers, hyphen, or underscore']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [80, 'Category cannot exceed 80 characters']
  },
  unit: {
    type: String,
    trim: true,
    default: ''
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: [0, 'Low stock threshold cannot be negative']
  },
  status: {
    type: String,
    enum: PRODUCT_STATUSES,
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.pre('validate', function(next) {
  this.nameKey = String(this.name || '').trim().toLowerCase();
  if (this.sku) {
    this.sku = String(this.sku).trim().toUpperCase();
  }
  next();
});

productSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.lowStockThreshold;
});

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ supplier: 1, nameKey: 1 }, { unique: true });
productSchema.index({ name: 'text', sku: 'text' });
productSchema.index({ category: 1, status: 1, supplier: 1 });

export { PRODUCT_STATUSES };
export default mongoose.model('Product', productSchema);
