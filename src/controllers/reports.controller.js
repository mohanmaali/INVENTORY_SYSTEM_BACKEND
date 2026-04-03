import asyncHandler from '../utils/asyncHandler.js';
import apiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';
import reportsService from '../services/reports.service.js';

const getInventoryReport = asyncHandler(async (req, res) => {
  const data = await reportsService.getInventoryReport(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, data);
});

const getLowStockReport = asyncHandler(async (req, res) => {
  const data = await reportsService.getLowStockReport(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, data);
});

const getOutOfStockReport = asyncHandler(async (req, res) => {
  const data = await reportsService.getOutOfStockReport(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, data);
});

const getSalesReport = asyncHandler(async (req, res) => {
  const data = await reportsService.getSalesReport(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, data);
});

const getPurchasesReport = asyncHandler(async (req, res) => {
  const data = await reportsService.getPurchasesReport(req.query);
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, data);
});

const getDashboardReport = asyncHandler(async (req, res) => {
  const data = await reportsService.getDashboardReport();
  apiResponse.successResponse(res, HTTP_STATUS.OK, MESSAGES.SUCCESS, data);
});

export default {
  getInventoryReport,
  getLowStockReport,
  getOutOfStockReport,
  getSalesReport,
  getPurchasesReport,
  getDashboardReport,
};
