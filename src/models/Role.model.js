import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  module: { type: String, required: true },
  actions: { type: [String], default: [] } // e.g. ["create","read","update","delete"]
}, { _id: false });

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  // permissions is an array of { module, actions }
  permissions: { type: [permissionSchema], default: [] }
}, {
  timestamps: true
});

export default mongoose.model('Role', roleSchema);
