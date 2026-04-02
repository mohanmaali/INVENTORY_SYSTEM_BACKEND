import mongoose from 'mongoose';
import { PATTERNS } from '../config/constants.js';

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters']
  },
  contact: {
    type: String,
    required: [true, 'Supplier contact is required'],
    trim: true,
    match: [PATTERNS.PHONE, 'Please provide a valid contact number']
  },
  email: {
    type: String,
    required: [true, 'Supplier email is required'],
    lowercase: true,
    trim: true,
    match: [PATTERNS.EMAIL, 'Please provide a valid email']
  },
  address: {
    type: String,
    required: [true, 'Supplier address is required'],
    trim: true,
    maxlength: [255, 'Supplier address cannot exceed 255 characters']
  }
}, {
  timestamps: true
});

export default mongoose.model('Supplier', supplierSchema);
