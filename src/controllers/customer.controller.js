import asyncHandler from '../utils/asyncHandler.js';
import apiResponse from '../utils/apiResponse.js';
import customerService from '../services/customer.service.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body, req.user?._id || null, req.user || null);
  apiResponse.createdResponse(res, MESSAGES.SUCCESS, customer);
});

const getAllCustomers = asyncHandler(async (req, res) => {
  const { customers, meta } = await customerService.getAllCustomers(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, customers, meta);
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, customer);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body, req.user || null);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, customer);
});

const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.softDeleteCustomer(req.params.id);
  apiResponse.noContentResponse(res);
});

const permanentlyDeleteCustomer = asyncHandler(async (req, res) => {
  await customerService.permanentlyDeleteCustomer(req.params.id);
  apiResponse.noContentResponse(res);
});

const getCustomerOrders = asyncHandler(async (req, res) => {
  const { orders, summary, meta } = await customerService.getCustomerOrders(req.params.id, req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, { orders, summary }, meta);
});

const getCustomerSummary = asyncHandler(async (req, res) => {
  const summary = await customerService.getCustomerSummary(req.params.id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, summary);
});

export default {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  permanentlyDeleteCustomer,
  getCustomerOrders,
  getCustomerSummary
};
