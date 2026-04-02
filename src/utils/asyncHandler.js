/**
 * Async handler wrapper to catch async errors and pass to next middleware
 * @param {Function} fn - Async controller function
 * @returns {Function} - Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;