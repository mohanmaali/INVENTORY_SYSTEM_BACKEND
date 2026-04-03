import productService from '../services/product.service.js';
import apiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

const createProduct = asyncHandler(async (req, res, next) => {
  const product = await productService.createProduct(req.body, req.user?._id || null);
  apiResponse.createdResponse(res, MESSAGES.SUCCESS, product);
});

const getAllProducts = asyncHandler(async (req, res, next) => {
  const { products, meta } = await productService.getAllProducts(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, products, meta);
});

const getProductById = asyncHandler(async (req, res, next) => {
  const product = await productService.getProductById(req.params.id);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, product);
});

const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, product);
});

const deleteProduct = asyncHandler(async (req, res, next) => {
  await productService.softDeleteProduct(req.params.id);
  apiResponse.noContentResponse(res);
});

const permanentlyDeleteProduct = asyncHandler(async (req, res, next) => {
  await productService.permanentlyDeleteProduct(req.params.id, req.query);
  apiResponse.noContentResponse(res);
});

const adjustStock = asyncHandler(async (req, res, next) => {
  const result = await productService.adjustStock(req.params.id, req.body, req.user?._id || null);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, result);
});

const getStockHistory = asyncHandler(async (req, res, next) => {
  const { logs, meta } = await productService.getStockHistory(req.params.id, req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, logs, meta);
});

export default {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  permanentlyDeleteProduct,
  adjustStock,
  getStockHistory
};
