import { PAGINATION } from '../config/constants.js';

/**
 * Calculate pagination metadata
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} - Pagination metadata
 */
const paginate = (page, limit, total) => {
  const currentPage = parseInt(page, 10) || PAGINATION.DEFAULT_PAGE;
  const itemsPerPage = parseInt(limit, 10) || PAGINATION.DEFAULT_LIMIT;
  const totalItems = total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    page: currentPage,
    limit: itemsPerPage,
    total: totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
};

/**
 * Calculate skip value for database query
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {number} - Skip value
 */
const getSkip = (page, limit) => {
  const currentPage = parseInt(page, 10) || PAGINATION.DEFAULT_PAGE;
  const itemsPerPage = parseInt(limit, 10) || PAGINATION.DEFAULT_LIMIT;
  return (currentPage - 1) * itemsPerPage;
};

export default {
  paginate,
  getSkip
};