import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import Supplier from '../models/Supplier.model.js';
import pagination from '../utils/pagination.js';
import AppError from '../utils/AppError.js';
import orderNumberUtil from '../utils/orderNumber.js';
import inventoryEvents from '../utils/inventoryEvents.js';
import productService from './product.service.js';
import customerService from './customer.service.js';
import { ERROR_TYPES, HTTP_STATUS } from '../config/constants.js';

const ORDER_NOT_FOUND = 'Order not found';
const ORDER_INVALID_TRANSITION = 'Invalid order status transition';
const ORDER_PENDING_CANCEL_ONLY = 'Only pending orders can be cancelled using delete';
const ORDER_UPDATE_PENDING_ONLY = 'Only pending orders can be updated';
const ORDER_PERMANENT_DELETE_RESTRICTED = 'Only pending or cancelled orders can be permanently deleted';
const PRODUCT_INACTIVE = 'One or more products are inactive or unavailable';
const INVALID_ORDER_PRODUCT = 'Product not found for one or more line items';
const INVALID_SUPPLIER = 'Supplier not found';
const INVALID_CUSTOMER = 'Customer not found';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const STATUS_TRANSITIONS = {
  purchase: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  },
  sale: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['completed'],
    completed: [],
    cancelled: []
  }
};

const ensureObjectId = (id, message = ORDER_NOT_FOUND) => {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(message, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'NOT_FOUND');
  }
  return new mongoose.Types.ObjectId(String(id));
};

const sanitizeOrder = order => {
  if (!order) {
    return order;
  }

  delete order.__v;

  if (Array.isArray(order.items)) {
    order.items = order.items.map(item => {
      if (item?.product && typeof item.product === 'object') {
        delete item.product.__v;
        if (item.product.supplier && typeof item.product.supplier === 'object') {
          delete item.product.supplier.__v;
        }
      }
      return item;
    });
  }

  if (order.supplier && typeof order.supplier === 'object') {
    delete order.supplier.__v;
  }

  if (order.customerRecord && typeof order.customerRecord === 'object') {
    delete order.customerRecord.__v;
  }

  if (order.createdBy && typeof order.createdBy === 'object') {
    delete order.createdBy.__v;
    delete order.createdBy.password;
  }

  return order;
};

const sanitizeTimeline = timeline => timeline.map(entry => {
  if (entry.changedBy && typeof entry.changedBy === 'object') {
    delete entry.changedBy.__v;
    delete entry.changedBy.password;
  }
  return entry;
});

const orderLookupStages = ({ includeTimeline = false } = {}) => {
  const pipeline = [
    {
      $lookup: {
        from: 'suppliers',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplier'
      }
    },
    {
      $unwind: {
        path: '$supplier',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdBy'
      }
    },
    {
      $unwind: {
        path: '$createdBy',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customerRecord'
      }
    },
    {
      $unwind: {
        path: '$customerRecord',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDocs'
      }
    },
    {
      $addFields: {
        items: {
          $map: {
            input: '$items',
            as: 'item',
            in: {
              quantity: '$$item.quantity',
              unitPrice: '$$item.unitPrice',
              subtotal: '$$item.subtotal',
              product: {
                $let: {
                  vars: {
                    matchedProduct: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$productDocs',
                            as: 'productDoc',
                            cond: { $eq: ['$$productDoc._id', '$$item.product'] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    _id: '$$matchedProduct._id',
                    name: '$$matchedProduct.name',
                    sku: '$$matchedProduct.sku',
                    price: '$$matchedProduct.price',
                    quantity: '$$matchedProduct.quantity',
                    status: '$$matchedProduct.status',
                    supplier: '$$matchedProduct.supplier'
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        productDocs: 0,
        __v: 0,
        'supplier.__v': 0,
        'customerRecord.__v': 0,
        'createdBy.__v': 0,
        'createdBy.password': 0
      }
    }
  ];

  if (includeTimeline) {
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'statusHistory.changedBy',
          foreignField: '_id',
          as: 'statusHistoryUsers'
        }
      },
      {
        $addFields: {
          statusHistory: {
            $map: {
              input: '$statusHistory',
              as: 'entry',
              in: {
                status: '$$entry.status',
                note: '$$entry.note',
                changedAt: '$$entry.changedAt',
                changedBy: {
                  $let: {
                    vars: {
                      matchedUser: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$statusHistoryUsers',
                              as: 'historyUser',
                              cond: { $eq: ['$$historyUser._id', '$$entry.changedBy'] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: {
                      _id: '$$matchedUser._id',
                      name: '$$matchedUser.name',
                      email: '$$matchedUser.email'
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          statusHistoryUsers: 0
        }
      }
    );
  } else {
    pipeline.push({
      $project: {
        statusHistory: 0
      }
    });
  }

  return pipeline;
};

const buildListFilters = queryParams => {
  const { type, status, supplier, fromDate, toDate } = queryParams || {};
  const filters = {};

  if (type) {
    filters.type = type;
  }

  if (status) {
    filters.status = status;
  }

  if (supplier) {
    filters.supplier = ensureObjectId(supplier, INVALID_SUPPLIER);
  }

  if (fromDate || toDate) {
    filters.createdAt = {};
    if (fromDate) {
      filters.createdAt.$gte = new Date(fromDate);
    }
    if (toDate) {
      filters.createdAt.$lte = new Date(toDate);
    }
  }

  return filters;
};

const ensureSupplierExists = async (supplierId, session) => {
  const supplier = await Supplier.findById(supplierId).select('_id').session(session).lean();
  if (!supplier) {
    throw new AppError(INVALID_SUPPLIER, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'SUPPLIER_NOT_FOUND');
  }
};

const getProductsForItems = async (items, session) => {
  const productIds = [...new Set(items.map(item => String(item.product)))];
  const objectIds = productIds.map(productId => ensureObjectId(productId, INVALID_ORDER_PRODUCT));

  const products = await Product.find({
    _id: { $in: objectIds },
    status: 'active'
  })
    .select('name sku price quantity status supplier')
    .session(session)
    .lean();

  if (products.length !== productIds.length) {
    throw new AppError(PRODUCT_INACTIVE, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'PRODUCT_NOT_FOUND');
  }

  return new Map(products.map(product => [String(product._id), product]));
};

const ensureSaleStockAvailability = (items, productsMap) => {
  const requestedByProduct = new Map();

  for (const item of items) {
    const productId = String(item.product);
    const current = requestedByProduct.get(productId) || 0;
    requestedByProduct.set(productId, current + Number(item.quantity));
  }

  for (const [productId, requestedQty] of requestedByProduct.entries()) {
    const product = productsMap.get(productId);
    if (!product || product.quantity < requestedQty) {
      const error = new AppError(
        `Insufficient stock for product ${product?.sku || productId}`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR,
        'STOCK_INSUFFICIENT'
      );
      error.product = product?.sku || productId;
      throw error;
    }
  }
};

const buildOrderItems = (items, productsMap) => items.map(item => {
  const product = productsMap.get(String(item.product));
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice ?? product.price);
  const subtotal = quantity * unitPrice;

  return {
    product: product._id,
    quantity,
    unitPrice,
    subtotal
  };
});

const emitLowStockEvents = lowStockEvents => {
  for (const payload of lowStockEvents) {
    if (payload) {
      inventoryEvents.emit('low_stock', payload);
    }
  }
};

const applyStockMovementForItems = async ({ order, direction, session, performedBy, note }) => {
  const lowStockEvents = [];

  // Keep item-level stock mutations inside the caller's transaction so partial
  // updates cannot leak if any line item fails midway through.
  for (const item of order.items) {
    const productId = item?.product?._id || item.product;
    const productSku = item?.product?.sku || null;

    try {
      const result = await productService.updateStockOnOrder(
        productId,
        item.quantity,
        direction,
        {
          note,
          performedBy,
          session
        }
      );

      if (result.lowStockEventPayload) {
        lowStockEvents.push(result.lowStockEventPayload);
      }
    } catch (error) {
      if (error.code === 'STOCK_INSUFFICIENT' && productSku) {
        error.product = productSku;
      }

      throw error;
    }
  }

  return lowStockEvents;
};

const buildTimelineEntry = (status, changedBy, note = '') => ({
  status,
  changedBy: changedBy || null,
  note,
  changedAt: new Date()
});

const buildStockOrderFromRawItems = (items, productsMap) => ({
  items: items.map(item => ({
    ...item,
    product: productsMap.get(String(item.product))
  }))
});

const createOrder = async (payload, createdBy = null) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const session = await mongoose.startSession();
    const lowStockEvents = [];

    try {
      let orderId;

      await session.withTransaction(async () => {
        if (payload.type === 'purchase') {
          await ensureSupplierExists(ensureObjectId(payload.supplier, INVALID_SUPPLIER), session);
        }

        const productsMap = await getProductsForItems(payload.items, session);
        if (payload.type === 'sale') {
          ensureSaleStockAvailability(payload.items, productsMap);
        }

        const items = buildOrderItems(payload.items, productsMap);
        const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
        const orderNumber = await orderNumberUtil.generateOrderNumber(payload.type, { session });
        let customerId = null;

        if (payload.type === 'sale') {
          const customer = await customerService.assertCustomerEligibleForSaleOrder(payload.customerId, totalAmount, session);
          customerId = customer._id;
        }

        const order = await Order.create([{
          orderNumber,
          type: payload.type,
          status: 'pending',
          items,
          supplier: payload.type === 'purchase' ? ensureObjectId(payload.supplier, INVALID_SUPPLIER) : null,
          customerId,
          totalAmount,
          note: payload.note || '',
          createdBy: createdBy || null,
          stockMoved: payload.type === 'sale',
          statusHistory: [buildTimelineEntry('pending', createdBy, 'Order created')]
        }], { session }).then(docs => docs[0]);

        orderId = order._id;

        if (payload.type === 'sale') {
          const stockOrder = buildStockOrderFromRawItems(
            order.items.map(item => item.toObject()),
            productsMap
          );

          const itemEvents = await applyStockMovementForItems({
            order: stockOrder,
            direction: 'deduct',
            session,
            performedBy: createdBy,
            note: orderNumber
          });

          lowStockEvents.push(...itemEvents);
        }
      });

      emitLowStockEvents(lowStockEvents);
      return getOrderById(orderId);
    } catch (error) {
      if (error?.code === 11000 && attempt < maxAttempts) {
        continue;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw new AppError('Failed to generate unique order number', HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR, 'ORDER_NUMBER_CONFLICT');
};

const updateOrder = async (orderId, payload, updatedBy = null) => {
  const id = ensureObjectId(orderId);
  const session = await mongoose.startSession();
  const lowStockEvents = [];

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        throw new AppError(ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'pending') {
        throw new AppError(
          ORDER_UPDATE_PENDING_ONLY,
          HTTP_STATUS.CONFLICT,
          ERROR_TYPES.CONFLICT_ERROR,
          'ORDER_UPDATE_PENDING_ONLY'
        );
      }

      const nextItemsInput = payload.items || order.items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      const nextSupplier = order.type === 'purchase'
        ? (Object.prototype.hasOwnProperty.call(payload, 'supplier') ? payload.supplier : order.supplier)
        : null;
      const nextCustomerId = order.type === 'sale'
        ? (Object.prototype.hasOwnProperty.call(payload, 'customerId') ? payload.customerId : order.customerId)
        : null;
      const nextNote = Object.prototype.hasOwnProperty.call(payload, 'note') ? (payload.note || '') : order.note;

      if (order.type === 'purchase') {
        await ensureSupplierExists(ensureObjectId(nextSupplier, INVALID_SUPPLIER), session);
      }

      const currentProductsMap = await getProductsForItems(
        order.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        session
      );

      if (order.type === 'sale' && order.stockMoved) {
        // Reverse the currently reserved stock first so the new item validation
        // sees the real available quantity before re-applying the updated items.
        const reverseEvents = await applyStockMovementForItems({
          order: buildStockOrderFromRawItems(
            order.items.map(item => item.toObject()),
            currentProductsMap
          ),
          direction: 'restore',
          session,
          performedBy: updatedBy,
          note: `${order.orderNumber}-UPDATE-ROLLBACK`
        });
        lowStockEvents.push(...reverseEvents);
      }

      const nextProductsMap = await getProductsForItems(nextItemsInput, session);
      if (order.type === 'sale') {
        ensureSaleStockAvailability(nextItemsInput, nextProductsMap);
        await customerService.assertCustomerEligibleForSaleOrder(nextCustomerId, nextItemsInput.reduce((sum, item) => {
          const product = nextProductsMap.get(String(item.product));
          const unitPrice = Number(item.unitPrice ?? product.price);
          return sum + (Number(item.quantity) * unitPrice);
        }, 0), session);
      }

      const nextItems = buildOrderItems(nextItemsInput, nextProductsMap);
      const nextTotalAmount = nextItems.reduce((sum, item) => sum + item.subtotal, 0);

      order.items = nextItems;
      order.totalAmount = nextTotalAmount;
      order.note = nextNote;

      if (order.type === 'purchase') {
        order.supplier = ensureObjectId(nextSupplier, INVALID_SUPPLIER);
      }

      if (order.type === 'sale') {
        order.customerId = ensureObjectId(nextCustomerId, INVALID_CUSTOMER);
      }

      if (order.type === 'sale' && order.stockMoved) {
        const applyEvents = await applyStockMovementForItems({
          order: buildStockOrderFromRawItems(nextItems, nextProductsMap),
          direction: 'deduct',
          session,
          performedBy: updatedBy,
          note: `${order.orderNumber}-UPDATED`
        });
        lowStockEvents.push(...applyEvents);
      }

      await order.save({ session });
    });

    emitLowStockEvents(lowStockEvents);
    return getOrderById(id);
  } finally {
    await session.endSession();
  }
};

const getAllOrders = async queryParams => {
  const pageNum = Math.max(parseInt(queryParams?.page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const perPage = Math.min(parseInt(queryParams?.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (pageNum - 1) * perPage;
  const filters = buildListFilters(queryParams);

  const result = await Order.aggregate([
    { $match: filters },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: perPage },
          ...orderLookupStages({ includeTimeline: false })
        ],
        meta: [
          { $count: 'total' }
        ]
      }
    },
    { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        orders: '$data',
        total: { $ifNull: ['$meta.total', 0] }
      }
    }
  ]);

  const orders = result?.[0]?.orders || [];
  const total = result?.[0]?.total || 0;

  return {
    orders: orders.map(sanitizeOrder),
    meta: pagination.paginate(pageNum, perPage, total)
  };
};

const getOrderById = async orderId => {
  const id = ensureObjectId(orderId);
  const result = await Order.aggregate([
    { $match: { _id: id } },
    ...orderLookupStages({ includeTimeline: true })
  ]);
  const order = result?.[0] || null;

  if (!order) {
    throw new AppError(ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'ORDER_NOT_FOUND');
  }

  return sanitizeOrder(order);
};

const executeStatusTransition = async ({ orderId, nextStatus, changedBy, note = '', requirePendingDelete = false }) => {
  const id = ensureObjectId(orderId);
  const session = await mongoose.startSession();
  const lowStockEvents = [];

  try {
    let order;

    await session.withTransaction(async () => {
      order = await Order.findById(id)
        .populate('items.product', 'sku')
        .session(session);

      if (!order) {
        throw new AppError(ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'ORDER_NOT_FOUND');
      }

      if (requirePendingDelete && order.status !== 'pending') {
        throw new AppError(
          ORDER_PENDING_CANCEL_ONLY,
          HTTP_STATUS.CONFLICT,
          ERROR_TYPES.CONFLICT_ERROR,
          'ORDER_PENDING_CANCEL_ONLY'
        );
      }

      const allowedTransitions = STATUS_TRANSITIONS[order.type]?.[order.status] || [];
      // Explicit transition map keeps the lifecycle predictable and blocks
      // skipping required intermediate states such as confirmed -> completed.
      if (!allowedTransitions.includes(nextStatus)) {
        throw new AppError(
          `${ORDER_INVALID_TRANSITION}: ${order.status} -> ${nextStatus}`,
          HTTP_STATUS.CONFLICT,
          ERROR_TYPES.CONFLICT_ERROR,
          'INVALID_ORDER_STATUS_TRANSITION'
        );
      }

      if (order.type === 'purchase' && nextStatus === 'confirmed' && !order.stockMoved) {
        const itemEvents = await applyStockMovementForItems({
          order,
          direction: 'restore',
          session,
          performedBy: changedBy,
          note: order.orderNumber
        });
        lowStockEvents.push(...itemEvents);
        order.stockMoved = true;
      }

      if (order.type === 'sale' && nextStatus === 'confirmed' && order.customerId && !order.balanceApplied) {
        // Balance only increases when the sale is confirmed so pending orders
        // do not count against receivables until the business accepts them.
        await customerService.updateCustomerBalance(order.customerId, order.totalAmount, 'increase', { session });
        order.balanceApplied = true;
      }

      if (nextStatus === 'cancelled' && order.stockMoved) {
        // Cancellation reverses only stock that has actually moved so that
        // pending purchase orders do not accidentally deduct inventory.
        const reverseDirection = order.type === 'sale' ? 'restore' : 'deduct';
        const itemEvents = await applyStockMovementForItems({
          order,
          direction: reverseDirection,
          session,
          performedBy: changedBy,
          note: `${order.orderNumber}-CANCELLED`
        });
        lowStockEvents.push(...itemEvents);
        order.stockMoved = false;
        order.cancelledAt = new Date();
      }

      if (nextStatus === 'cancelled' && order.type === 'sale' && order.customerId && order.balanceApplied) {
        await customerService.updateCustomerBalance(order.customerId, order.totalAmount, 'decrease', { session });
        order.balanceApplied = false;
      }

      order.status = nextStatus;
      order.statusHistory.push(buildTimelineEntry(nextStatus, changedBy, note || `Status changed to ${nextStatus}`));
      await order.save({ session });
    });

    emitLowStockEvents(lowStockEvents);
    return getOrderById(id);
  } finally {
    await session.endSession();
  }
};

const updateOrderStatus = async (orderId, payload, changedBy = null) => {
  return executeStatusTransition({
    orderId,
    nextStatus: payload.status,
    changedBy,
    note: payload.note || ''
  });
};

const cancelOrder = async (orderId, changedBy = null) => {
  await executeStatusTransition({
    orderId,
    nextStatus: 'cancelled',
    changedBy,
    note: 'Order cancelled via delete endpoint',
    requirePendingDelete: true
  });

  return null;
};

const permanentlyDeleteOrder = async (orderId, deletedBy = null) => {
  const id = ensureObjectId(orderId);
  const session = await mongoose.startSession();
  const lowStockEvents = [];

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(id)
        .populate('items.product', 'sku')
        .session(session);

      if (!order) {
        throw new AppError(ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'ORDER_NOT_FOUND');
      }

      if (!['pending', 'cancelled'].includes(order.status)) {
        throw new AppError(
          ORDER_PERMANENT_DELETE_RESTRICTED,
          HTTP_STATUS.CONFLICT,
          ERROR_TYPES.CONFLICT_ERROR,
          'ORDER_PERMANENT_DELETE_RESTRICTED'
        );
      }

      if (order.stockMoved) {
        // Reverse any reserved/moved stock before removing the order record so
        // inventory remains correct even when deleting a still-pending sale.
        const reverseDirection = order.type === 'sale' ? 'restore' : 'deduct';
        const itemEvents = await applyStockMovementForItems({
          order,
          direction: reverseDirection,
          session,
          performedBy: deletedBy,
          note: `${order.orderNumber}-PERMANENT-DELETE`
        });
        lowStockEvents.push(...itemEvents);
      }

      if (order.type === 'sale' && order.customerId && order.balanceApplied) {
        await customerService.updateCustomerBalance(order.customerId, order.totalAmount, 'decrease', { session });
      }

      await Order.deleteOne({ _id: id }, { session });
    });

    emitLowStockEvents(lowStockEvents);
    return null;
  } finally {
    await session.endSession();
  }
};

const getOrderTimeline = async orderId => {
  const id = ensureObjectId(orderId);
  const order = await Order.findById(id)
    .select('orderNumber type status statusHistory')
    .populate('statusHistory.changedBy', 'name email')
    .lean();

  if (!order) {
    throw new AppError(ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'ORDER_NOT_FOUND');
  }

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    type: order.type,
    status: order.status,
    timeline: sanitizeTimeline(order.statusHistory || [])
  };
};

const getOrdersSummary = async queryParams => {
  const filters = buildListFilters(queryParams);
  const summary = await Order.aggregate([
    { $match: filters },
    {
      $group: {
        _id: { type: '$type', status: '$status' },
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id.type': 1, '_id.status': 1 } }
  ]);

  const grouped = {
    purchase: {},
    sale: {}
  };

  for (const row of summary) {
    grouped[row._id.type][row._id.status] = {
      count: row.count,
      totalAmount: row.totalAmount
    };
  }

  return {
    summary,
    grouped
  };
};

export default {
  createOrder,
  updateOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  permanentlyDeleteOrder,
  getOrderTimeline,
  getOrdersSummary
};
