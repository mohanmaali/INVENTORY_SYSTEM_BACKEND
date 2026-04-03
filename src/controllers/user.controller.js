import userService from '../services/user.service.js';
import apiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { MESSAGES, HTTP_STATUS } from '../config/constants.js';

/**
 * @route PATCH /api/users/:id/role
 * @desc Assign or change a user's role by role ID
 * @access Private (Admin only)
 */
const assignRole = asyncHandler(async (req, res, next) => {
  const { roleId } = req.body;
  const user = await userService.assignRole(req.params.id, roleId);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, user);
});

/**
 * @route GET /api/users
 * @desc Get all users with pagination
 * @access Private (Admin only)
 */
const getAllUsers = asyncHandler(async (req, res, next) => {
  const { users, meta } = await userService.getAllUsers(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, users, meta);
});

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private (Admin only)
 */
const getUserById = asyncHandler(async (req, res, next) => {
  const user = await userService.getUserById(req.params.id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, user);
});

/**
 * @route PUT /api/users/:id
 * @desc Update user
 * @access Private (Admin only)
 */
const updateUser = asyncHandler(async (req, res, next) => {
  const user = await userService.updateUser(req.params.id, req.body);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.USER_UPDATED, user);
});

/**
 * @route DELETE /api/users/:id
 * @desc Delete user
 * @access Private (Admin only)
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  await userService.deleteUser(req.params.id);
  apiResponse.noContentResponse(res);
});

export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
  ,assignRole
};