import User from '../models/User.model.js';
import jwt from '../utils/jwt.js';
import { hashPassword } from '../utils/hashPassword.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_TYPES, MESSAGES } from '../config/constants.js';
import logger from '../config/logger.js';

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} - Created user and token
 */
const register = async (userData) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError(
      'Email already registered',
      HTTP_STATUS.CONFLICT,
      ERROR_TYPES.CONFLICT_ERROR
    );
  }

  // Attempt to assign a default role (Staff) by roleId if available
  try {
    const Role = await import('../models/Role.model.js');
    const staffRole = await Role.default.findOne({ name: /^Staff$/i }).select('_id').lean();
    if (staffRole) {
      userData.roleId = staffRole._id;
    }
  } catch (e) {
    // If roles model or lookup fails, continue without roleId — won't block registration
  }

  // Create user (roleId included when available)
  const user = await User.create(userData);

  // Generate JWT token
  const token = jwt.generateToken({ id: user._id });

  logger.info(`User registered: ${user.email}`);
  return { user, token };
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} - User and token
 */
const login = async (email, password) => {
  // Find user with password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError(
      MESSAGES.INVALID_CREDENTIALS,
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_TYPES.AUTHENTICATION_ERROR
    );
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError(
      'Account is deactivated',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_TYPES.AUTHENTICATION_ERROR
    );
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError(
      MESSAGES.INVALID_CREDENTIALS,
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_TYPES.AUTHENTICATION_ERROR
    );
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate token
  const token = jwt.generateToken({ id: user._id });

  logger.info(`User logged in: ${user.email}`);
  return { user, token };
};

/**
 * Logout user (client-side token removal)
 */
const logout = async () => {
  // In a more advanced implementation, you might want to blacklist the token
  // For now, we'll just return success
  return { message: 'Logged out successfully' };
};

/**
 * Get current user profile
 * @param {string} userId - User ID
 * @returns {Object} - User profile
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId).populate('roleId');
  if (!user) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }
  const profile = user.getPublicProfile();
  profile.role = profile.roleId;
  return profile;
};

/**
 * Update current user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated user
 */
const updateProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }

  // Update allowed fields
  const allowedFields = ['name', 'avatar'];
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  });

  await user.save();
  logger.info(`Profile updated: ${user.email}`);
  return user.getPublicProfile();
};

/**
 * Change password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} - Success message
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError(
      MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ERROR_TYPES.NOT_FOUND_ERROR
    );
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError(
      'Current password is incorrect',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_TYPES.VALIDATION_ERROR
    );
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed: ${user.email}`);
  return { message: 'Password changed successfully' };
};

export default {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
