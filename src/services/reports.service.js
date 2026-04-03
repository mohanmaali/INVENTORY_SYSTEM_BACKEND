import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';

const DEFAULT_GROUP_BY = 'day';

const toObjectId = value => (value ? new mongoose.Types.ObjectId(String(value)) : null);

const getMonthDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const getInclusiveDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return getMonthDateRange();
  }

  const { start: defaultStart, end: defaultEnd } = getMonthDateRange();
  const start = startDate ? new Date(startDate) : defaultStart;
  const end = endDate ? new Date(endDate) : defaultEnd;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getTodayDateRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getOrderGroupKey = groupBy => {
  if (groupBy === 'week') {
    return {
      year: { $isoWeekYear: '$createdAt' },
      week: { $isoWeek: '$createdAt' },
    };
  }

  if (groupBy === 'month') {
    return {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
    };
  }

  return {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
  };
};

const normalizeOrderGroup = (groupBy, row) => {
  if (groupBy === 'week') return `${row?._id?.year}-W${String(row?._id?.week || 0).padStart(2, '0')}`;
  if (groupBy === 'month') return `${row?._id?.year}-${String(row?._id?.month || 0).padStart(2, '0')}`;
  return row?._id?.day || '';
};

const buildProductMatch = query => {
  const match = {};
  if (query?.category) match.category = query.category;
  if (query?.supplierId) match.supplier = toObjectId(query.supplierId);
  return match;
};

const buildSalesOrderMatch = query => {
  const { start, end } = getInclusiveDateRange(query?.startDate, query?.endDate);
  const match = {
    type: 'sale',
    status: 'completed',
    createdAt: { $gte: start, $lte: end },
  };
  if (query?.customerId) {
    match.customerId = toObjectId(query.customerId);
  }
  return { match, start, end };
};

const buildPurchaseOrderMatch = query => {
  const { start, end } = getInclusiveDateRange(query?.startDate, query?.endDate);
  const match = {
    type: 'purchase',
    status: 'completed',
    createdAt: { $gte: start, $lte: end },
  };
  if (query?.supplierId) {
    match.supplier = toObjectId(query.supplierId);
  }
  return { match, start, end };
};

// Computes total product counts split by status.
const getInventoryStatusSummary = async productMatch => {
  const rows = await Product.aggregate([
    { $match: productMatch },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byStatus = { active: 0, inactive: 0, discontinued: 0 };
  for (const row of rows) {
    byStatus[row._id] = row.count;
  }

  return {
    totalProducts: byStatus.active + byStatus.inactive + byStatus.discontinued,
    byStatus,
  };
};

// Computes total stock value as sum(quantity * price).
const getInventoryTotalStockValue = async productMatch => {
  const rows = await Product.aggregate([
    { $match: productMatch },
    { $group: { _id: null, totalStockValue: { $sum: { $multiply: ['$quantity', '$price'] } } } },
  ]);
  return rows?.[0]?.totalStockValue || 0;
};

// Computes stock and value grouped by category.
const getInventoryCategoryBreakdown = async productMatch => {
  return Product.aggregate([
    { $match: productMatch },
    {
      $group: {
        _id: '$category',
        productCount: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
      },
    },
    { $sort: { totalValue: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        category: '$_id',
        productCount: 1,
        totalQuantity: 1,
        totalValue: 1,
      },
    },
  ]);
};

// Computes top highest stock products.
const getTopHighestStockProducts = async productMatch => {
  return Product.aggregate([
    { $match: productMatch },
    { $sort: { quantity: -1, name: 1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplierDoc',
      },
    },
    { $unwind: { path: '$supplierDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        sku: 1,
        category: 1,
        quantity: 1,
        price: 1,
        stockValue: { $multiply: ['$quantity', '$price'] },
        supplier: { _id: '$supplierDoc._id', name: '$supplierDoc.name' },
      },
    },
  ]);
};

// Computes top lowest stock products greater than zero.
const getTopLowestStockProducts = async productMatch => {
  return Product.aggregate([
    { $match: { ...productMatch, quantity: { $gt: 0 } } },
    { $sort: { quantity: 1, name: 1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplierDoc',
      },
    },
    { $unwind: { path: '$supplierDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        sku: 1,
        category: 1,
        quantity: 1,
        lowStockThreshold: 1,
        supplier: { _id: '$supplierDoc._id', name: '$supplierDoc.name' },
      },
    },
  ]);
};

// Computes low/out-of-stock rows with supplier details.
const getStockAlertRows = async (productMatch, isOutOfStock = false) => {
  const quantityFilter = isOutOfStock ? { quantity: 0 } : { $expr: { $lte: ['$quantity', '$lowStockThreshold'] } };
  return Product.aggregate([
    { $match: productMatch },
    { $match: quantityFilter },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplierDoc',
      },
    },
    { $unwind: { path: '$supplierDoc', preserveNullAndEmptyArrays: true } },
    { $sort: { quantity: 1, lowStockThreshold: -1, name: 1 } },
    {
      $project: {
        _id: 1,
        name: 1,
        sku: 1,
        category: 1,
        quantity: 1,
        threshold: '$lowStockThreshold',
        supplier: {
          _id: '$supplierDoc._id',
          name: '$supplierDoc.name',
        },
      },
    },
  ]);
};

// Computes total sales count, revenue and average order value.
const getSalesTotals = async orderMatch => {
  const rows = await Order.aggregate([
    { $match: orderMatch },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
      },
    },
  ]);
  const totalOrders = rows?.[0]?.totalOrders || 0;
  const totalRevenue = rows?.[0]?.totalRevenue || 0;
  return {
    totalOrders,
    totalRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
  };
};

// Computes sales revenue grouped by day/week/month.
const getSalesRevenueByGroup = async (orderMatch, groupBy) => {
  const rows = await Order.aggregate([
    { $match: orderMatch },
    { $group: { _id: getOrderGroupKey(groupBy), revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
  ]);
  return rows.map(row => ({
    period: normalizeOrderGroup(groupBy, row),
    revenue: row.revenue,
    orders: row.orders,
  }));
};

// Computes top five best-selling products from completed sales.
const getTopSellingProducts = async orderMatch => {
  return Order.aggregate([
    { $match: orderMatch },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalQuantitySold: { $sum: '$items.quantity' },
        totalSalesValue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalQuantitySold: -1, totalSalesValue: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: '$productDoc._id',
        name: '$productDoc.name',
        sku: '$productDoc.sku',
        totalQuantitySold: 1,
        totalSalesValue: 1,
      },
    },
  ]);
};

// Computes top five customers by spend on completed sales.
const getTopCustomersBySpend = async orderMatch => {
  return Order.aggregate([
    { $match: orderMatch },
    {
      $group: {
        _id: '$customerId',
        totalSpend: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
      },
    },
    { $sort: { totalSpend: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customerDoc',
      },
    },
    { $unwind: { path: '$customerDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: '$customerDoc._id',
        name: '$customerDoc.name',
        customerCode: '$customerDoc.customerCode',
        totalSpend: 1,
        totalOrders: 1,
      },
    },
  ]);
};

// Computes total purchase count and spend.
const getPurchaseTotals = async orderMatch => {
  const rows = await Order.aggregate([
    { $match: orderMatch },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
      },
    },
  ]);
  return {
    totalOrders: rows?.[0]?.totalOrders || 0,
    totalSpent: rows?.[0]?.totalSpent || 0,
  };
};

// Computes purchase spend grouped by day/week/month.
const getPurchaseSpendByGroup = async (orderMatch, groupBy) => {
  const rows = await Order.aggregate([
    { $match: orderMatch },
    { $group: { _id: getOrderGroupKey(groupBy), spend: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
  ]);

  return rows.map(row => ({
    period: normalizeOrderGroup(groupBy, row),
    spend: row.spend,
    orders: row.orders,
  }));
};

// Computes top five suppliers by completed purchase value.
const getTopSuppliersBySpend = async orderMatch => {
  return Order.aggregate([
    { $match: orderMatch },
    {
      $group: {
        _id: '$supplier',
        totalSpend: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
      },
    },
    { $sort: { totalSpend: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'suppliers',
        localField: '_id',
        foreignField: '_id',
        as: 'supplierDoc',
      },
    },
    { $unwind: { path: '$supplierDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: '$supplierDoc._id',
        name: '$supplierDoc.name',
        totalSpend: 1,
        totalOrders: 1,
      },
    },
  ]);
};

// Computes dashboard active product count.
const getDashboardTotalProducts = async () => Product.countDocuments({ status: 'active' });

// Computes dashboard total stock value.
const getDashboardTotalStockValue = async () => {
  const rows = await Product.aggregate([
    { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$price'] } } } },
  ]);
  return rows?.[0]?.total || 0;
};

// Computes dashboard low stock item count.
const getDashboardLowStockCount = async () =>
  Product.countDocuments({ $expr: { $lte: ['$quantity', '$lowStockThreshold'] } });

// Computes dashboard completed sales for today.
const getDashboardSalesToday = async () => {
  const { start, end } = getTodayDateRange();
  const rows = await Order.aggregate([
    { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
  ]);
  return {
    count: rows?.[0]?.count || 0,
    revenue: rows?.[0]?.revenue || 0,
  };
};

// Computes dashboard confirmed purchases for today.
const getDashboardPurchasesToday = async () => {
  const { start, end } = getTodayDateRange();
  const rows = await Order.aggregate([
    { $match: { type: 'purchase', status: 'confirmed', createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, count: { $sum: 1 }, spend: { $sum: '$totalAmount' } } },
  ]);
  return {
    count: rows?.[0]?.count || 0,
    spend: rows?.[0]?.spend || 0,
  };
};

// Computes dashboard recent five orders.
const getDashboardRecentOrders = async () =>
  Order.aggregate([
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 1,
        orderNumber: 1,
        type: 1,
        status: 1,
        totalAmount: 1,
        createdAt: 1,
      },
    },
  ]);

// Computes dashboard top-selling product for current month.
const getDashboardTopSellingProduct = async () => {
  const { start, end } = getMonthDateRange();
  const rows = await Order.aggregate([
    { $match: { type: 'sale', status: 'completed', createdAt: { $gte: start, $lte: end } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalQuantitySold: { $sum: '$items.quantity' },
        totalSalesValue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalQuantitySold: -1, totalSalesValue: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: '$productDoc._id',
        name: '$productDoc.name',
        sku: '$productDoc.sku',
        totalQuantitySold: 1,
        totalSalesValue: 1,
      },
    },
  ]);
  return rows?.[0] || null;
};

const getInventoryReport = async query => {
  const productMatch = buildProductMatch(query);

  const [statusSummary, totalStockValue, categoryBreakdown, topHighestStock, topLowestStock] =
    await Promise.all([
      getInventoryStatusSummary(productMatch),
      getInventoryTotalStockValue(productMatch),
      getInventoryCategoryBreakdown(productMatch),
      getTopHighestStockProducts(productMatch),
      getTopLowestStockProducts(productMatch),
    ]);

  return {
    filters: {
      category: query?.category || null,
      supplierId: query?.supplierId || null,
    },
    totals: {
      ...statusSummary,
      totalStockValue,
    },
    categoryBreakdown,
    topHighestStock,
    topLowestStock,
  };
};

const getLowStockReport = async query => {
  const productMatch = buildProductMatch(query);
  const items = await getStockAlertRows(productMatch, false);
  return {
    filters: {
      category: query?.category || null,
      supplierId: query?.supplierId || null,
    },
    totalCount: items.length,
    items,
  };
};

const getOutOfStockReport = async query => {
  const productMatch = buildProductMatch(query);
  const items = await getStockAlertRows(productMatch, true);
  return {
    filters: {
      category: query?.category || null,
      supplierId: query?.supplierId || null,
    },
    totalCount: items.length,
    items,
  };
};

const getSalesReport = async query => {
  const groupBy = query?.groupBy || DEFAULT_GROUP_BY;
  const { match, start, end } = buildSalesOrderMatch(query);

  const [totals, revenueByPeriod, topProducts, topCustomers] = await Promise.all([
    getSalesTotals(match),
    getSalesRevenueByGroup(match, groupBy),
    getTopSellingProducts(match),
    getTopCustomersBySpend(match),
  ]);

  return {
    filters: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      customerId: query?.customerId || null,
      groupBy,
    },
    totals,
    revenueByPeriod,
    topProducts,
    topCustomers,
  };
};

const getPurchasesReport = async query => {
  const groupBy = query?.groupBy || DEFAULT_GROUP_BY;
  const { match, start, end } = buildPurchaseOrderMatch(query);

  const [totals, spendByPeriod, topSuppliers] = await Promise.all([
    getPurchaseTotals(match),
    getPurchaseSpendByGroup(match, groupBy),
    getTopSuppliersBySpend(match),
  ]);

  return {
    filters: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      supplierId: query?.supplierId || null,
      groupBy,
    },
    totals,
    spendByPeriod,
    topSuppliers,
  };
};

const getDashboardReport = async () => {
  const [
    totalProducts,
    totalStockValue,
    lowStockCount,
    salesToday,
    purchasesToday,
    recentOrders,
    topSellingProduct,
  ] = await Promise.all([
    getDashboardTotalProducts(),
    getDashboardTotalStockValue(),
    getDashboardLowStockCount(),
    getDashboardSalesToday(),
    getDashboardPurchasesToday(),
    getDashboardRecentOrders(),
    getDashboardTopSellingProduct(),
  ]);

  return {
    totalProducts,
    totalStockValue,
    lowStockCount,
    salesToday,
    purchasesToday,
    recentOrders,
    topSellingProduct,
  };
};

export default {
  getInventoryReport,
  getLowStockReport,
  getOutOfStockReport,
  getSalesReport,
  getPurchasesReport,
  getDashboardReport,
};
