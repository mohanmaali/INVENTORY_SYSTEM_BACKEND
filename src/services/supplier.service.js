import mongoose from 'mongoose';
import Supplier from '../models/Supplier.model.js';
import AppError from '../utils/AppError.js';
import pagination from '../utils/pagination.js';
import { ERROR_TYPES, HTTP_STATUS } from '../config/constants.js';

const SUPPLIER_NOT_FOUND = 'Supplier not found';
const SUPPLIER_ALREADY_EXISTS = 'Supplier already exists';

const getAllSuppliers = async (queryParams) => {
  const { page, limit, search, name, contact, sort } = queryParams || {};

  const pageNum = parseInt(page, 10) || 1;
  const perPage = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * perPage;

  const match = {};
  const filters = [];

  if (search) {
    filters.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } }
      ]
    });
  }

  if (name) {
    filters.push({ name: { $regex: name, $options: 'i' } });
  }

  if (contact) {
    filters.push({ contact: { $regex: contact, $options: 'i' } });
  }

  if (filters.length === 1) {
    Object.assign(match, filters[0]);
  } else if (filters.length > 1) {
    match.$and = filters;
  }

  let sortField = 'createdAt';
  let sortOrder = -1;
  if (typeof sort === 'string' && sort.length > 0) {
    if (sort.startsWith('-')) {
      sortField = sort.slice(1);
      sortOrder = -1;
    } else {
      sortField = sort;
      sortOrder = 1;
    }
  }

  const pipeline = [
    { $match: match },
    { $sort: { [sortField]: sortOrder } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: perPage }
        ],
        meta: [
          { $count: 'total' }
        ]
      }
    },
    { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        suppliers: '$data',
        meta: { total: { $ifNull: ['$meta.total', 0] } }
      }
    }
  ];

  const res = await Supplier.aggregate(pipeline);
  const suppliers = res?.[0]?.suppliers || [];
  const total = res?.[0]?.meta?.total || 0;
  const meta = pagination.paginate(pageNum, perPage, total);

  return { suppliers, meta };
};

const getSupplierById = async (supplierId) => {
  if (!mongoose.Types.ObjectId.isValid(String(supplierId))) {
    throw new AppError(SUPPLIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }

  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier) {
    throw new AppError(SUPPLIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }

  return supplier;
};

const createSupplier = async (supplierData) => {
  const existingSupplier = await Supplier.findOne({
    $or: [
      { email: supplierData.email.toLowerCase() },
      { name: new RegExp(`^${supplierData.name}$`, 'i') }
    ]
  }).lean();

  if (existingSupplier) {
    throw new AppError(SUPPLIER_ALREADY_EXISTS, HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR);
  }

  const supplier = await Supplier.create({
    ...supplierData,
    email: supplierData.email.toLowerCase()
  });

  return supplier.toObject();
};

const updateSupplier = async (supplierId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(String(supplierId))) {
    throw new AppError(SUPPLIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }

  const payload = { ...updateData };
  if (payload.email) {
    payload.email = payload.email.toLowerCase();
  }

  const supplier = await Supplier.findByIdAndUpdate(
    supplierId,
    { $set: payload },
    { new: true, runValidators: true }
  ).lean();

  if (!supplier) {
    throw new AppError(SUPPLIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }

  return supplier;
};

const deleteSupplier = async (supplierId) => {
  if (!mongoose.Types.ObjectId.isValid(String(supplierId))) {
    throw new AppError(SUPPLIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }

  const supplier = await Supplier.findByIdAndDelete(supplierId).lean();
  if (!supplier) {
    throw new AppError(SUPPLIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }

  return null;
};

export default {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
