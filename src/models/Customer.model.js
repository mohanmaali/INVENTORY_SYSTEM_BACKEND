import mongoose from 'mongoose';
import { PATTERNS } from '../config/constants.js';

const CUSTOMER_TYPES = ['individual', 'business'];
const CUSTOMER_STATUSES = ['active', 'inactive', 'blacklisted'];

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true,
    default: ''
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  state: {
    type: String,
    trim: true,
    default: ''
  },
  zipCode: {
    type: String,
    trim: true,
    default: ''
  },
  country: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  customerCode: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [120, 'Customer name cannot exceed 120 characters']
  },
  type: {
    type: String,
    enum: CUSTOMER_TYPES,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
    sparse: true,
    unique: true,
    match: [PATTERNS.EMAIL, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Customer phone is required'],
    trim: true,
    match: [PATTERNS.PHONE, 'Please provide a valid phone number']
  },
  address: {
    type: addressSchema,
    default: () => ({})
  },
  companyName: {
    type: String,
    trim: true,
    default: ''
  },
  taxId: {
    type: String,
    trim: true,
    default: ''
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative']
  },
  outstandingBalance: {
    type: Number,
    default: 0,
    min: [0, 'Outstanding balance cannot be negative']
  },
  status: {
    type: String,
    enum: CUSTOMER_STATUSES,
    default: 'active'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

customerSchema.pre('validate', function(next) {
  if (!this.email) {
    this.email = null;
  }

  if (this.type !== 'business') {
    this.companyName = '';
    this.taxId = this.taxId || '';
  }

  next();
});

customerSchema.index({ customerCode: 1 }, { unique: true });
customerSchema.index({ name: 'text', email: 'text', phone: 'text', customerCode: 'text' });
customerSchema.index({ type: 1, status: 1, createdAt: -1 });

export { CUSTOMER_STATUSES, CUSTOMER_TYPES };
export default mongoose.model('Customer', customerSchema);
