import rolesService from '../services/roles.service.js';
import apiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

const getAllRoles = asyncHandler(async (req, res, next) => {
  const { roles, meta } = await rolesService.getAllRoles(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, roles, meta);
});

const getRoleById = asyncHandler(async (req, res, next) => {
  const role = await rolesService.getRoleById(req.params.id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, role);
});

const createRole = asyncHandler(async (req, res, next) => {
  const role = await rolesService.createRole(req.body);
  apiResponse.successResponse(res, HTTP_STATUS.CREATED, MESSAGES.SUCCESS, role);
});

const updateRole = asyncHandler(async (req, res, next) => {
  const role = await rolesService.updateRole(req.params.id, req.body);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, role);
});

const deleteRole = asyncHandler(async (req, res, next) => {
  await rolesService.deleteRole(req.params.id);
  apiResponse.noContentResponse(res);
});

export default {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
