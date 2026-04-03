import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Supplier from '../models/Supplier.model.js';
import StockLog from '../models/StockLog.model.js';
import pagination from '../utils/pagination.js';
import AppError from '../utils/AppError.js';
import inventoryEvents from '../utils/inventoryEvents.js';
import { ERROR_TYPES, HTTP_STATUS } from '../config/constants.js';

const PRODUCT_NOT_FOUND = 'Product not found';
const SUPPLIER_NOT_FOUND = 'Supplier not found';
const PRODUCT_ALREADY_EXISTS = 'Product already exists for this supplier';
const SKU_ALREADY_EXISTS = 'SKU already exists';
const STOCK_INSUFFICIENT = 'Insufficient stock for this operation';
const PRODUCT_DELETE_REQUIRES_ZERO_STOCK = 'Product cannot be permanently deleted while quantity is greater than 0';
const PRODUCT_DELETE_HISTORY_EXISTS = 'Product cannot be permanently deleted while stock history exists';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const buildProductResponseProjection = {
  nameKey: 0,
  __v: 0,
  'supplier.__v': 0
};

const normalizeSku = sku => String(sku || '').trim().toUpperCase();
const normalizeNameKey = name => String(name || '').trim().toLowerCase();

const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureObjectId = (id, notFoundMessage = PRODUCT_NOT_FOUND) => {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(notFoundMessage, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'NOT_FOUND');
  }
  return new mongoose.Types.ObjectId(String(id));
};

const ensureSupplierExists = async supplierId => {
  const exists = await Supplier.exists({ _id: supplierId });
  if (!exists) {
    throw new AppError(SUPPLIER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'SUPPLIER_NOT_FOUND');
  }
};

const generateUniqueSku = async () => {
  let sku;
  let exists = true;

  while (exists) {
    sku = `SKU-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    exists = await Product.exists({ sku });
  }

  return sku;
};

const getAllProducts = async queryParams => {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search, category, status, supplier, sort } = queryParams || {};

  const pageNum = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const perPage = Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (pageNum - 1) * perPage;

  const match = {};

  if (search) {
    match.$or = [
      { name: { $regex: escapeRegex(search), $options: 'i' } },
      { sku: { $regex: escapeRegex(search), $options: 'i' } }
    ];
  }

  if (category) {
    match.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  }

  if (status) {
    match.status = status;
  }

  if (supplier) {
    match.supplier = ensureObjectId(supplier);
  }

  let sortField = 'createdAt';
  let sortOrder = -1;
  if (typeof sort === 'string' && sort.length > 0) {
    if (sort.startsWith('-')) {
      sortField = sort.slice(1);
      sortOrder = -1;
    } else {
      sortField = sort;
      sortOrder = 1;
    }
  }

  const pipeline = [
    { $match: match },
    { $sort: { [sortField]: sortOrder } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: perPage },
          {
            $lookup: {
              from: 'suppliers',
              localField: 'supplier',
              foreignField: '_id',
              as: 'supplier'
            }
          },
          { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
          {
            $addFields: {
              isLowStock: { $lte: ['$quantity', '$lowStockThreshold'] }
            }
          },
          { $project: buildProductResponseProjection }
        ],
        meta: [
          { $count: 'total' }
        ]
      }
    },
    { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        products: '$data',
        meta: { total: { $ifNull: ['$meta.total', 0] } }
      }
    }
  ];

  const res = await Product.aggregate(pipeline);
  const products = res?.[0]?.products || [];
  const total = res?.[0]?.meta?.total || 0;
  const meta = pagination.paginate(pageNum, perPage, total);

  return { products, meta };
};

const getProductById = async productId => {
  const id = ensureObjectId(productId);
  const product = await Product.findById(id).populate('supplier').lean();

  if (!product) {
    throw new AppError(PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'PRODUCT_NOT_FOUND');
  }

  product.isLowStock = product.quantity <= product.lowStockThreshold;
  delete product.nameKey;
  if (product.supplier) {
    delete product.supplier.__v;
  }

  return product;
};

const createProduct = async (productData, performedBy = null) => {
  const supplierId = ensureObjectId(productData.supplier, SUPPLIER_NOT_FOUND);
  await ensureSupplierExists(supplierId);

  const nameKey = normalizeNameKey(productData.name);
  const sku = productData.sku ? normalizeSku(productData.sku) : await generateUniqueSku();

  const duplicateByName = await Product.exists({ supplier: supplierId, nameKey });
  if (duplicateByName) {
    throw new AppError(PRODUCT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR, 'PRODUCT_ALREADY_EXISTS');
  }

  const duplicateSku = await Product.exists({ sku });
  if (duplicateSku) {
    throw new AppError(SKU_ALREADY_EXISTS, HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR, 'SKU_ALREADY_EXISTS');
  }

  const session = await mongoose.startSession();

  try {
    let productId;

    await session.withTransaction(async () => {
      const product = await Product.create([{
        ...productData,
        sku,
        supplier: supplierId,
        nameKey
      }], { session }).then(docs => docs[0]);

      productId = product._id;

      if (product.quantity > 0) {
        await StockLog.create([{
          productId: product._id,
          type: 'restock',
          delta: product.quantity,
          quantityBefore: 0,
          quantityAfter: product.quantity,
          note: 'Initial stock on product creation',
          performedBy
        }], { session });
      }
    });

    return getProductById(productId);
  } finally {
    await session.endSession();
  }
};

const updateProduct = async (productId, updateData) => {
  const id = ensureObjectId(productId);
  const payload = { ...updateData };

  delete payload.quantity;
  delete payload.sku;

  if (payload.supplier) {
    const supplierId = ensureObjectId(payload.supplier, SUPPLIER_NOT_FOUND);
    await ensureSupplierExists(supplierId);
    payload.supplier = supplierId;
  }

  if (payload.name) {
    payload.nameKey = normalizeNameKey(payload.name);
  }

  if (payload.nameKey || payload.supplier) {
    const currentProduct = await Product.findById(id).select('name supplier').lean();
    if (!currentProduct) {
      throw new AppError(PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'PRODUCT_NOT_FOUND');
    }

    const nextNameKey = payload.nameKey || normalizeNameKey(currentProduct.name);
    const nextSupplierId = payload.supplier || currentProduct.supplier;
    const duplicate = await Product.exists({
      _id: { $ne: id },
      supplier: nextSupplierId,
      nameKey: nextNameKey
    });

    if (duplicate) {
      throw new AppError(PRODUCT_ALREADY_EXISTS, HTTP_STATUS.CONFLICT, ERROR_TYPES.CONFLICT_ERROR, 'PRODUCT_ALREADY_EXISTS');
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true }
  ).lean();

  if (!updatedProduct) {
    throw new AppError(PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'PRODUCT_NOT_FOUND');
  }

  return getProductById(id);
};

const softDeleteProduct = async productId => {
  const id = ensureObjectId(productId);
  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { $set: { status: 'discontinued' } },
    { new: true }
  ).lean();

  if (!updatedProduct) {
    throw new AppError(PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'PRODUCT_NOT_FOUND');
  }

  return null;
};

const permanentlyDeleteProduct = async (productId, options = {}) => {
  const id = ensureObjectId(productId);
  const { deleteStockLogs = false } = options;

  const product = await Product.findById(id).select('quantity').lean();

  if (!product) {
    throw new AppError(PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'PRODUCT_NOT_FOUND');
  }

  if (product.quantity > 0) {
    throw new AppError(
      PRODUCT_DELETE_REQUIRES_ZERO_STOCK,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_TYPES.VALIDATION_ERROR,
      'PRODUCT_DELETE_REQUIRES_ZERO_STOCK'
    );
  }

  const stockLogExists = await StockLog.exists({ productId: id });
  if (stockLogExists && !deleteStockLogs) {
    throw new AppError(
      PRODUCT_DELETE_HISTORY_EXISTS,
      HTTP_STATUS.CONFLICT,
      ERROR_TYPES.CONFLICT_ERROR,
      'PRODUCT_DELETE_HISTORY_EXISTS'
    );
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      if (deleteStockLogs) {
        await StockLog.deleteMany({ productId: id }, { session });
      }

      await Product.deleteOne({ _id: id }, { session });
    });

    return null;
  } finally {
    await session.endSession();
  }
};

const mutateStock = async ({ productId, type, delta, note = '', performedBy = null, session: externalSession = null }) => {
  const id = ensureObjectId(productId);
  const numericDelta = Number(delta);

  if (!Number.isInteger(numericDelta) || numericDelta === 0) {
    throw new AppError('Stock delta must be a non-zero integer', HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'INVALID_STOCK_DELTA');
  }

  const runMutation = async session => {
    let updatedProduct;
    let stockLog;

    const filter = {
      _id: id,
      status: { $ne: 'discontinued' }
    };

    // Atomic guard on negative deltas prevents overselling during concurrent updates.
    if (numericDelta < 0) {
      filter.quantity = { $gte: Math.abs(numericDelta) };
    }

    const previousProduct = await Product.findOneAndUpdate(
      filter,
      { $inc: { quantity: numericDelta } },
      { new: false, session, runValidators: true }
    );

    if (!previousProduct) {
      const existingProduct = await Product.findById(id).select('quantity status').session(session);
      if (!existingProduct) {
        throw new AppError(PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'PRODUCT_NOT_FOUND');
      }
      if (numericDelta < 0) {
        throw new AppError(STOCK_INSUFFICIENT, HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'STOCK_INSUFFICIENT');
      }
      throw new AppError('Cannot modify stock for a discontinued product', HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'PRODUCT_DISCONTINUED');
    }

    const quantityBefore = previousProduct.quantity;
    const quantityAfter = quantityBefore + numericDelta;

    stockLog = await StockLog.create([{
      productId: id,
      type,
      delta: numericDelta,
      quantityBefore,
      quantityAfter,
      note: note || '',
      performedBy
    }], { session }).then(docs => docs[0].toObject());

    updatedProduct = await Product.findById(id).populate('supplier').session(session).lean();
    updatedProduct.isLowStock = updatedProduct.quantity <= updatedProduct.lowStockThreshold;
    delete updatedProduct.nameKey;
    if (updatedProduct.supplier) {
      delete updatedProduct.supplier.__v;
    }

    const lowStockEventPayload = updatedProduct.quantity <= updatedProduct.lowStockThreshold && numericDelta < 0
      ? {
          productId: updatedProduct._id.toString(),
          sku: updatedProduct.sku,
          quantity: updatedProduct.quantity,
          lowStockThreshold: updatedProduct.lowStockThreshold
        }
      : null;

    return { product: updatedProduct, stockLog, lowStockEventPayload };
  };

  if (externalSession) {
    return runMutation(externalSession);
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await runMutation(session);
    });

    if (result.lowStockEventPayload) {
      // Emit after commit so downstream listeners only react to committed stock levels.
      inventoryEvents.emit('low_stock', result.lowStockEventPayload);
    }

    return result;
  } finally {
    await session.endSession();
  }
};

const adjustStock = async (productId, adjustmentData, performedBy) => {
  const { type, delta, note } = adjustmentData;

  if ((type === 'restock' || type === 'return') && delta < 0) {
    throw new AppError(`${type} delta must be greater than 0`, HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'INVALID_STOCK_DELTA');
  }

  return mutateStock({
    productId,
    type,
    delta,
    note,
    performedBy,
    session: adjustmentData.session || null
  });
};

const getStockHistory = async (productId, queryParams) => {
  const id = ensureObjectId(productId);
  const productExists = await Product.exists({ _id: id });

  if (!productExists) {
    throw new AppError(PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR, 'PRODUCT_NOT_FOUND');
  }

  const pageNum = Math.max(parseInt(queryParams?.page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const perPage = Math.min(parseInt(queryParams?.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (pageNum - 1) * perPage;

  const pipeline = [
    { $match: { productId: id } },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: perPage },
          {
            $lookup: {
              from: 'users',
              localField: 'performedBy',
              foreignField: '_id',
              as: 'performedBy'
            }
          },
          { $unwind: { path: '$performedBy', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              __v: 0,
              'performedBy.password': 0,
              'performedBy.__v': 0
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
        logs: '$data',
        meta: { total: { $ifNull: ['$meta.total', 0] } }
      }
    }
  ];

  const res = await StockLog.aggregate(pipeline);
  const logs = res?.[0]?.logs || [];
  const total = res?.[0]?.meta?.total || 0;
  const meta = pagination.paginate(pageNum, perPage, total);

  return { logs, meta };
};

const updateStockOnOrder = async (productId, qty, direction, options = {}) => {
  if (!['deduct', 'restore'].includes(direction)) {
    throw new AppError('Invalid stock direction', HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'INVALID_STOCK_DIRECTION');
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    throw new AppError('Order quantity must be a positive integer', HTTP_STATUS.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR, 'INVALID_ORDER_QUANTITY');
  }

  const delta = direction === 'deduct' ? -qty : qty;
  const type = direction === 'deduct' ? 'sale' : 'return';
  const note = options.note || (direction === 'deduct' ? 'Stock deducted for order placement' : 'Stock restored after order cancellation/return');

  return mutateStock({
    productId,
    type,
    delta,
    note,
    performedBy: options.performedBy || null,
    session: options.session || null
  });
};

export {
  adjustStock,
  getAllProducts,
  getProductById,
  getStockHistory,
  permanentlyDeleteProduct,
  softDeleteProduct,
  updateProduct,
  updateStockOnOrder
};

export default {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  softDeleteProduct,
  permanentlyDeleteProduct,
  adjustStock,
  getStockHistory,
  updateStockOnOrder
};
