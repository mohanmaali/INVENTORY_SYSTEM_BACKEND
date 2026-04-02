import supplierService from '../services/supplier.service.js';
import apiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

const getAllSuppliers = asyncHandler(async (req, res, next) => {
  const { suppliers, meta } = await supplierService.getAllSuppliers(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, suppliers, meta);
});

const getSupplierById = asyncHandler(async (req, res, next) => {
  const supplier = await supplierService.getSupplierById(req.params.id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, supplier);
});

const createSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await supplierService.createSupplier(req.body);
  apiResponse.createdResponse(res, MESSAGES.SUCCESS, supplier);
});

const updateSupplier = asyncHandler(async (req, res, next) => {
  const supplier = await supplierService.updateSupplier(req.params.id, req.body);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, supplier);
});

const deleteSupplier = asyncHandler(async (req, res, next) => {
  await supplierService.deleteSupplier(req.params.id);
  apiResponse.noContentResponse(res);
});

export default {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
