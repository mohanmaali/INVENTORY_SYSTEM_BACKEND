import asyncHandler from '../utils/asyncHandler.js';
import apiResponse from '../utils/apiResponse.js';
import ordersService from '../services/orders.service.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

const getAllOrders = asyncHandler(async (req, res) => {
  const { orders, meta } = await ordersService.getAllOrders(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, orders, meta);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await ordersService.getOrderById(req.params.id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, order);
});

const createOrder = asyncHandler(async (req, res) => {
  const order = await ordersService.createOrder(req.body, req.user?._id || null);
  apiResponse.createdResponse(res, MESSAGES.SUCCESS, order);
});

const updateOrder = asyncHandler(async (req, res) => {
  const order = await ordersService.updateOrder(req.params.id, req.body, req.user?._id || null);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, order);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await ordersService.updateOrderStatus(req.params.id, req.body, req.user?._id || null);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, order);
});

const deleteOrder = asyncHandler(async (req, res) => {
  await ordersService.cancelOrder(req.params.id, req.user?._id || null);
  apiResponse.noContentResponse(res);
});

const permanentlyDeleteOrder = asyncHandler(async (req, res) => {
  await ordersService.permanentlyDeleteOrder(req.params.id, req.user?._id || null);
  apiResponse.noContentResponse(res);
});

const getOrdersSummary = asyncHandler(async (req, res) => {
  const summary = await ordersService.getOrdersSummary(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, summary);
});

const getOrderTimeline = asyncHandler(async (req, res) => {
  const timeline = await ordersService.getOrderTimeline(req.params.id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, timeline);
});

export default {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  permanentlyDeleteOrder,
  getOrdersSummary,
  getOrderTimeline
};
