import User from '../models/User.model.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_TYPES, MESSAGES } from '../config/constants.js';
import logger from '../config/logger.js';
import pagination from '../utils/pagination.js';
import Role from '../models/Role.model.js';
import mongoose from 'mongoose';

// Get all users with pagination
const getAllUsers = async (queryParams) => {
  const { page, limit, search, sort } = queryParams || {};

  const pageNum = parseInt(page, 10) || 1;
  const perPage = parseInt(limit, 10) || 10;

  // Build match stage
  const match = {};
  if (search) {
    match.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Determine sort
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

  const skip = (pageNum - 1) * perPage;

  // Aggregation pipeline to get paginated users + total count in single query
  const pipeline = [
    { $match: match },
    { $sort: { [sortField]: sortOrder } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: perPage },
          {
            $lookup: {
              from: 'roles',
              localField: 'roleId',
              foreignField: '_id',
              as: 'role'
            }
          },
          { $unwind: { path: '$role', preserveNullAndEmptyArrays: true } },
          { $project: { password: 0, __v: 0, 'role.__v': 0 } }
        ],
        meta: [ { $count: 'total' } ]
      }
    },
    { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        users: '$data',
        meta: { total: { $ifNull: ['$meta.total', 0] } }
      }
    }
  ];

  const res = await User.aggregate(pipeline);
  const users = (res && res[0] && Array.isArray(res[0].users)) ? res[0].users : [];
  const total = (res && res[0] && res[0].meta && res[0].meta.total) ? res[0].meta.total : 0;
  const meta = pagination.paginate(pageNum, perPage, total);

  logger.info(`Retrieved ${users.length} users`);
  return { users, meta };
};

// Get user by ID
const getUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(String(userId)) } },
    { $limit: 1 },
    { $project: { password: 0, __v: 0 } }
  ];
  const res = await User.aggregate(pipeline);
  const user = res && res[0] ? res[0] : null;
  if (!user) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }
  return user;
};

// Update user (only allowed fields will be modified)
const updateUser = async (userId, updateData) => {
  // Only allow certain fields to be updated (role changes via assignRole)
  const allowedFields = ['name', 'email', 'isActive'];
  const payload = {};
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) payload[field] = updateData[field];
  });

  const updated = await User.findByIdAndUpdate(userId, { $set: payload }, { new: true });
  if (!updated) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }
  logger.info(`User updated: ${updated.email}`);
  // Return plain object without sensitive fields
  const obj = updated.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

// Delete user by ID
const deleteUser = async (userId) => {
  const deleted = await User.findByIdAndDelete(userId);
  if (!deleted) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }
  logger.info(`User deleted: ${deleted.email}`);
  return null;
};

// Assign a role to a user by `roleId`. Updates the `roleId` reference only.
const assignRole = async (userId, roleId) => {
  // Verify role exists using aggregation for consistency
  if (!mongoose.Types.ObjectId.isValid(String(roleId))) {
    throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }
  const roleRes = await Role.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(String(roleId)) } },
    { $limit: 1 }
  ]);
  const role = roleRes && roleRes[0] ? roleRes[0] : null;
  if (!role) {
    throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
  }

  // Atomically update user with new role reference
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { roleId: new mongoose.Types.ObjectId(String(roleId)) } },
    { new: true }
  );
  if (!updated) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }
  logger.info(`Assigned role ${role.name} to user ${updated.email}`);
  const obj = updated.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignRole
};
