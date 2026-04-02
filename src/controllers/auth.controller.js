import authService from '../services/auth.service.js';
import apiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { MESSAGES, HTTP_STATUS } from '../config/constants.js';

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
const register = asyncHandler(async (req, res, next) => {
  const { user, token } = await authService.register(req.body);
  apiResponse.createdResponse(res, HTTP_STATUS.CREATED, MESSAGES.REGISTER_SUCCESS, {
    user: user.getPublicProfile(),
    token
  });
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login(email, password);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.LOGIN_SUCCESS, {
    user: user.getPublicProfile(),
    token
  });
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
const logout = asyncHandler(async (req, res, next) => {
  const result = await authService.logout();
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.LOGOUT_SUCCESS, result);
});

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
const getProfile = asyncHandler(async (req, res, next) => {
  const profile = await authService.getProfile(req.user._id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, profile);
});

/**
 * @route PUT /api/auth/profile
 * @desc Update current user profile
 * @access Private
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  const profile = await authService.updateProfile(req.user._id, req.body);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.USER_UPDATED, profile);
});

/**
 * @route PUT /api/auth/change-password
 * @desc Change password
 * @access Private
 */
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user._id, currentPassword, newPassword);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, result);
});

export default {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};