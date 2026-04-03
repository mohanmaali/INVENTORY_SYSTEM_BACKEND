import mongoose from 'mongoose';
import Customer from '../models/Customer.model.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import Role from '../models/Role.model.js';
import pagination from '../utils/pagination.js';
import customerCodeUtil from '../utils/customerCode.js';
import AppError from '../utils/AppError.js';
import { ERROR_TYPES, HTTP_STATUS } from '../config/constants.js';

const CUSTOMER_NOT_FOUND = 'Customer not found';
const CUSTOMER_OPEN_ORDERS_EXIST = 'Customer cannot be deleted while open orders exist';
const CUSTOMER_HAS_ORDER_HISTORY = 'Customer cannot be permanently deleted when order history exists';
const CUSTOMER_CODE_CONFLICT = 'Failed to generate unique customer code';
const CUSTOMER_EMAIL_EXISTS = 'Customer email already exists';
const CUSTOMER_BLACKLISTED = 'Customer is blacklisted and cannot place new orders';
const CUSTOMER_INACTIVE = 'Customer is inactive and cannot place new orders';
const CREDIT_LIMIT_EXCEEDED = 'Customer credit limit exceeded';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const ensureObjectId = (id, message = CUSTOMER_NOT_FOUND) => {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(message, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'NOT_FOUND');
  }

  return new mongoose.Types.ObjectId(String(id));
};

const sanitizeCustomer = customer => {
  if (!customer) {
    return customer;
  }

  delete customer.__v;
  if (customer.createdBy && typeof customer.createdBy === 'object') {
    delete customer.createdBy.__v;
    delete customer.createdBy.password;
  }

  return customer;
};

const getRoleName = async user => {
  if (!user?.roleId) {
    return null;
  }

  const role = await Role.findById(user.roleId).select('name').lean();
  return role?.name || null;
};

const assertAdminOrManager = async user => {
  const roleName = await getRoleName(user);
  if (!['admin', 'manager'].includes(roleName)) {
    throw new AppError(
      'Only Admin or Manager can create customers',
      HTTP_STATUS.FORBIDDEN,
      ERROR_TYPES.AUTHORIZATION_ERROR,
      'CUSTOMER_CREATE_FORBIDDEN'
    );
  }
};

const assertAdmin = async user => {
  const roleName = await getRoleName(user);
  if (roleName !== 'Admin') {
    throw new AppError(
      'Only Admin can perform this customer status change',
      HTTP_STATUS.FORBIDDEN,
      ERROR_TYPES.AUTHORIZATION_ERROR,
      'CUSTOMER_STATUS_FORBIDDEN'
    );
  }
};

const ensureUniqueEmail = async (email, excludeId = null, session = null) => {
  if (!email) {
    return;
  }

  const query = { email: String(email).trim().toLowerCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await Customer.findOne(query).select('_id').session(session).lean();
  if (existing) {
    throw new AppError(CUSTOMER_EMAIL_EXISTS, HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR, 'CUSTOMER_EMAIL_EXISTS');
  }
};

const buildCustomerFilters = queryParams => {
  const filters = {};
  const { search, type, status } = queryParams || {};

  if (search) {
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { customerCode: { $regex: escaped, $options: 'i' } }
    ];
  }

  if (type) {
    filters.type = type;
  }

  if (status) {
    filters.status = status;
  }

  return filters;
};

const createCustomer = async (payload, createdBy = null, actor = null) => {
  await assertAdminOrManager(actor);
  await ensureUniqueEmail(payload.email);

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      let customerId;

      await session.withTransaction(async () => {
        const customerCode = await customerCodeUtil.generateCustomerCode({ session });
        const customer = await Customer.create([{
          ...payload,
          email: payload.email || null,
          customerCode,
          createdBy: createdBy || null
        }], { session }).then(docs => docs[0]);

        customerId = customer._id;
      });

      return getCustomerById(customerId);
    } catch (error) {
      if (error?.code === 11000 && attempt < maxAttempts) {
        continue;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw new AppError(CUSTOMER_CODE_CONFLICT, HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR, 'CUSTOMER_CODE_CONFLICT');
};

const getAllCustomers = async queryParams => {
  const pageNum = Math.max(parseInt(queryParams?.page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const perPage = Math.min(parseInt(queryParams?.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (pageNum - 1) * perPage;
  const filters = buildCustomerFilters(queryParams);

  const result = await Customer.aggregate([
    { $match: filters },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: perPage },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy'
            }
          },
          { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              __v: 0,
              'createdBy.password': 0,
              'createdBy.__v': 0
            }
          }
        ],
        meta: [
          { $count: 'total' }
        ]
      }
    },
    { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        customers: '$data',
        total: { $ifNull: ['$meta.total', 0] }
      }
    }
  ]);

  const customers = result?.[0]?.customers || [];
  const total = result?.[0]?.total || 0;

  return {
    customers: customers.map(sanitizeCustomer),
    meta: pagination.paginate(pageNum, perPage, total)
  };
};

const getCustomerById = async customerId => {
  const id = ensureObjectId(customerId);
  const customer = await Customer.findById(id).populate('createdBy', '-password').lean();

  if (!customer) {
    throw new AppError(CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'CUSTOMER_NOT_FOUND');
  }

  return sanitizeCustomer(customer);
};

const updateCustomer = async (customerId, payload, actor = null) => {
  const id = ensureObjectId(customerId);
  const existingCustomer = await Customer.findById(id).lean();

  if (!existingCustomer) {
    throw new AppError(CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'CUSTOMER_NOT_FOUND');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    await ensureUniqueEmail(payload.email, id);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    const nextStatus = payload.status;
    const currentStatus = existingCustomer.status;

    // Blacklist and reactivation are admin-only because they directly affect
    // whether future sale orders can be created for the customer.
    if (nextStatus === 'blacklisted' || (currentStatus === 'blacklisted' && nextStatus !== 'blacklisted')) {
      await assertAdmin(actor);
    }
  }

  const updatePayload = { ...payload };
  delete updatePayload.customerCode;
  delete updatePayload.outstandingBalance;

  const updatedCustomer = await Customer.findByIdAndUpdate(
    id,
    { $set: { ...updatePayload, email: updatePayload.email || null } },
    { new: true, runValidators: true }
  )
    .populate('createdBy', '-password')
    .lean();

  return sanitizeCustomer(updatedCustomer);
};

const softDeleteCustomer = async customerId => {
  const id = ensureObjectId(customerId);
  const openOrderExists = await Order.exists({
    type: 'sale',
    customerId: id,
    status: { $in: ['pending', 'processing'] }
  });

  if (openOrderExists) {
    throw new AppError(
      CUSTOMER_OPEN_ORDERS_EXIST,
      HTTP_STATUS.CONFLICT,
      ERROR_TYPES.CONFLICT_ERROR,
      'CUSTOMER_OPEN_ORDERS_EXIST'
    );
  }

  const customer = await Customer.findByIdAndUpdate(
    id,
    { $set: { status: 'inactive' } },
    { new: true }
  ).lean();

  if (!customer) {
    throw new AppError(CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'CUSTOMER_NOT_FOUND');
  }

  return null;
};

const permanentlyDeleteCustomer = async customerId => {
  const id = ensureObjectId(customerId);
  const hasOrderHistory = await Order.exists({ customerId: id });

  if (hasOrderHistory) {
    throw new AppError(
      CUSTOMER_HAS_ORDER_HISTORY,
      HTTP_STATUS.CONFLICT,
      ERROR_TYPES.CONFLICT_ERROR,
      'CUSTOMER_HAS_ORDER_HISTORY'
    );
  }

  const result = await Customer.deleteOne({ _id: id });
  if (!result.deletedCount) {
    throw new AppError(CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'CUSTOMER_NOT_FOUND');
  }

  return null;
};

const getCustomerOrders = async (customerId, queryParams) => {
  const id = ensureObjectId(customerId);
  const customerExists = await Customer.exists({ _id: id });
  if (!customerExists) {
    throw new AppError(CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'CUSTOMER_NOT_FOUND');
  }

  const pageNum = Math.max(parseInt(queryParams?.page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const perPage = Math.min(parseInt(queryParams?.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (pageNum - 1) * perPage;
  const filters = {
    type: 'sale',
    customerId: id
  };

  if (queryParams?.status) {
    filters.status = queryParams.status;
  }

  if (queryParams?.fromDate || queryParams?.toDate) {
    filters.createdAt = {};
    if (queryParams.fromDate) {
      filters.createdAt.$gte = new Date(queryParams.fromDate);
    }
    if (queryParams.toDate) {
      filters.createdAt.$lte = new Date(queryParams.toDate);
    }
  }

  const result = await Order.aggregate([
    { $match: filters },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: perPage }
        ],
        meta: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpend: { $sum: '$totalAmount' }
            }
          }
        ]
      }
    },
    { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        orders: '$data',
        summary: {
          totalOrders: { $ifNull: ['$meta.totalOrders', 0] },
          totalSpend: { $ifNull: ['$meta.totalSpend', 0] }
        }
      }
    }
  ]);

  const orders = result?.[0]?.orders || [];
  const summary = result?.[0]?.summary || { totalOrders: 0, totalSpend: 0 };

  return {
    orders,
    summary,
    meta: pagination.paginate(pageNum, perPage, summary.totalOrders)
  };
};

const getCustomerSummary = async customerId => {
  const id = ensureObjectId(customerId);
  const customer = await Customer.findById(id).select('name customerCode outstandingBalance').lean();

  if (!customer) {
    throw new AppError(CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'CUSTOMER_NOT_FOUND');
  }

  const [orderStats] = await Order.aggregate([
    {
      $match: {
        type: 'sale',
        customerId: id
      }
    },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpend: { $sum: '$totalAmount' },
              lastOrderDate: { $max: '$createdAt' }
            }
          }
        ],
        products: [
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              totalQuantity: { $sum: '$items.quantity' }
            }
          },
          { $sort: { totalQuantity: -1, _id: 1 } },
          { $limit: 1 },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'product'
            }
          },
          { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              productId: '$_id',
              name: '$product.name',
              sku: '$product.sku',
              totalQuantity: 1
            }
          }
        ]
      }
    }
  ]);

  const overview = orderStats?.overview?.[0] || {
    totalOrders: 0,
    totalSpend: 0,
    lastOrderDate: null
  };

  return {
    customerId: customer._id,
    customerCode: customer.customerCode,
    name: customer.name,
    totalOrders: overview.totalOrders,
    totalSpend: overview.totalSpend,
    outstandingBalance: customer.outstandingBalance,
    lastOrderDate: overview.lastOrderDate,
    mostPurchasedProduct: orderStats?.products?.[0] || null
  };
};

const updateCustomerBalance = async (customerId, amount, direction, options = {}) => {
  const id = ensureObjectId(customerId);
  const numericAmount = Number(amount);

  if (!['increase', 'decrease'].includes(direction)) {
    throw new AppError('Invalid balance direction', HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'INVALID_BALANCE_DIRECTION');
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new AppError('Balance amount must be greater than 0', HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'INVALID_BALANCE_AMOUNT');
  }

  const session = options.session || null;
  const delta = direction === 'increase' ? numericAmount : -numericAmount;
  const filter = { _id: id };

  // Prevent negative balances so outstanding amount always reflects unpaid
  // exposure that still needs to be settled against customer credit.
  if (direction === 'decrease') {
    filter.outstandingBalance = { $gte: numericAmount };
  }

  const customer = await Customer.findOneAndUpdate(
    filter,
    { $inc: { outstandingBalance: delta } },
    { new: true, session, runValidators: true }
  ).lean();

  if (!customer) {
    const existingCustomer = await Customer.findById(id).session(session).lean();
    if (!existingCustomer) {
      throw new AppError(CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'CUSTOMER_NOT_FOUND');
    }

    throw new AppError(
      'Outstanding balance cannot become negative',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_TYPES.VALIDATION_ERROR,
      'INVALID_CUSTOMER_BALANCE'
    );
  }

  return sanitizeCustomer(customer);
};

const assertCustomerEligibleForSaleOrder = async (customerId, orderAmount, session = null) => {
  const id = ensureObjectId(customerId);
  const customer = await Customer.findById(id).session(session).lean();

  if (!customer) {
    throw new AppError(CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'CUSTOMER_NOT_FOUND');
  }

  // Blacklist is a hard stop before order creation so the order module never
  // reserves stock for a customer the business has blocked.
  if (customer.status === 'blacklisted') {
    throw new AppError(CUSTOMER_BLACKLISTED, HTTP_STATUS.FORBIDDEN, ERROR_TYPES.AUTHORIZATION_ERROR, 'CUSTOMER_BLACKLISTED');
  }

  if (customer.status !== 'active') {
    throw new AppError(CUSTOMER_INACTIVE, HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'CUSTOMER_INACTIVE');
  }

  const projectedOutstanding = customer.outstandingBalance + Number(orderAmount || 0);

  // Credit guard runs before order creation so we reject the sale before stock
  // gets reserved and before any pending order record is inserted.
  if ((customer.creditLimit === 0 && projectedOutstanding > 0) || (customer.creditLimit > 0 && projectedOutstanding > customer.creditLimit)) {
    const error = new AppError(CREDIT_LIMIT_EXCEEDED, HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR, 'CREDIT_LIMIT_EXCEEDED');
    error.limit = customer.creditLimit;
    error.outstanding = customer.outstandingBalance;
    throw error;
  }

  return customer;
};

export {
  assertCustomerEligibleForSaleOrder,
  updateCustomerBalance
};

export default {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
  permanentlyDeleteCustomer,
  getCustomerOrders,
  getCustomerSummary,
  updateCustomerBalance,
  assertCustomerEligibleForSaleOrder
};
