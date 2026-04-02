import asyncHandler from '../utils/asyncHandler.js';
import apiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

const getAllOrders = asyncHandler(async (req, res, next) => {
  // Placeholder: integrate with Order model as needed
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, []);
});

const getOrderById = asyncHandler(async (req, res, next) => {
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, { id: req.params.id });
});

const createOrder = asyncHandler(async (req, res, next) => {
  apiResponse.successResponse(res, HTTP_STATUS.CREATED, MESSAGES.SUCCESS, req.body);
});

const updateOrder = asyncHandler(async (req, res, next) => {
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, { id: req.params.id, ...req.body });
});

const deleteOrder = asyncHandler(async (req, res, next) => {
  apiResponse.noContentResponse(res);
});

export default {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder
};
