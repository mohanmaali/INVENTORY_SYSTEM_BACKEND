import Role from '../models/Role.model.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_TYPES, MESSAGES } from '../config/constants.js';
import pagination from '../utils/pagination.js';
import mongoose from 'mongoose';

const getAllRoles = async (query) => {
  const { page, limit, sort } = query || {};
  const pageNum = parseInt(page, 10) || undefined;
  const perPage = parseInt(limit, 10) || undefined;

  // Determine sort field and order
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

  const skip = ((pageNum || 1) - 1) * (perPage || 10);
  const limitVal = perPage || 10;

  // Aggregation pipeline with $facet to get paginated data and total count in one query
  const pipeline = [
    { $sort: { [sortField]: sortOrder } },
    {
      $facet: {
        data: [ { $skip: skip }, { $limit: limitVal } ],
        meta: [ { $count: 'total' } ]
      }
    },
    { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        data: 1,
        meta: { total: { $ifNull: ['$meta.total', 0] } }
      }
    }
  ];

  const res = await Role.aggregate(pipeline);
  const data = (res && res[0] && Array.isArray(res[0].data)) ? res[0].data : [];
  const total = (res && res[0] && res[0].meta && res[0].meta.total) ? res[0].meta.total : 0;
  const meta = pagination.paginate(pageNum, limitVal, total);
  return { roles: data, meta };
};

const getRoleById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }
  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(String(id)) } },
    { $limit: 1 }
  ];
  const res = await Role.aggregate(pipeline);
  const role = res && res[0] ? res[0] : null;
  if (!role) {
    throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }
  return role;
};

const createRole = async (data) => {
  // Prevent creating duplicate by name using aggregation (case-insensitive)
  const pipeline = [
    { $match: { name: { $regex: `^${data.name}$`, $options: 'i' } } },
    { $limit: 1 }
  ];
  const existing = await Role.aggregate(pipeline);
  if (existing && existing.length > 0) {
    throw new AppError('Role already exists', HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR);
  }
  const role = await Role.create(data);
  return role;
};

const updateRole = async (id, data) => {
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }
  Object.assign(role, data);
  await role.save();
  return role;
};

const deleteRole = async (id) => {
  const role = await Role.findById(id);
  if (!role) {
    throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }
  await Role.findByIdAndDelete(id);
  return null;
};

export default {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
