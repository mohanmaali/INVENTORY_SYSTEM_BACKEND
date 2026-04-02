import User from '../models/User.model.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_TYPES, MESSAGES } from '../config/constants.js';
import logger from '../config/logger.js';
import pagination from '../utils/pagination.js';

/**
 * Get all users with pagination
 * @param {Object} queryParams - Query parameters
 * @returns {Object} - Users and pagination metadata
 */
const getAllUsers = async (queryParams) => {
  const { page, limit, search, sort } = queryParams;

  // Build query
  let query = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await User.countDocuments(query);

  // Calculate pagination
  const paginationData = pagination.paginate(page, limit, total);
  const skip = pagination.getSkip(page, limit);

  // Get users with pagination
  const users = await User.find(query)
    .sort(sort || '-createdAt')
    .skip(skip)
    .limit(paginationData.limit);

  logger.info(`Retrieved ${users.length} users`);
  return { users, meta: paginationData };
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object} - User
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }
  return user.getPublicProfile();
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated user
 */
const updateUser = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }

  // Update allowed fields
  const allowedFields = ['name', 'email', 'role', 'isActive'];
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  });

  await user.save();
  logger.info(`User updated: ${user.email}`);
  return user.getPublicProfile();
};

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {null}
 */
const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }

  await User.findByIdAndDelete(userId);
  logger.info(`User deleted: ${user.email}`);
  return null;
};

export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};