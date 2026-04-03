import Role from '../models/Role.model.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_TYPES } from '../config/constants.js';
import mongoose from 'mongoose';

// Cache for permission lookups to reduce DB load.
// Key: `${roleIdOrName}:${moduleName}` -> { actionsArray, fetchedAt }
const roleModuleCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Fetch actions array for a given role (by id or name) and module using aggregation.
 * Returns an array of action strings or null when not found.
 * This avoids fetching the whole Role document and performs a single targeted pipeline.
 */
const getModuleActions = async (roleIdOrName, moduleName) => {
  if (!roleIdOrName) return null;
  const cacheKey = `${String(roleIdOrName)}:${String(moduleName).toLowerCase()}`;
  const cached = roleModuleCache.get(cacheKey);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.actionsArray;
  }

  // Build match stage depending on whether roleIdOrName looks like an ObjectId
  let matchStage;
  if (mongoose.Types.ObjectId.isValid(String(roleIdOrName))) {
    matchStage = { _id: new mongoose.Types.ObjectId(String(roleIdOrName)) };
  } else {
    matchStage = { name: new RegExp(`^${String(roleIdOrName)}$`, 'i') };
  }

  const pipeline = [
    { $match: matchStage },
    { $project: { permissions: 1 } },
    { $unwind: '$permissions' },
    { $match: { 'permissions.module': { $regex: `^${String(moduleName)}$`, $options: 'i' } } },
    { $project: { actions: '$permissions.actions' } },
    { $limit: 1 }
  ];

  const res = await Role.aggregate(pipeline);
  const actionsArray = res && res[0] && Array.isArray(res[0].actions) ? res[0].actions : null;
  if (actionsArray) {
    roleModuleCache.set(cacheKey, { actionsArray, fetchedAt: Date.now() });
  }
  return actionsArray;
};

/**
 * Authorization middleware factory: authorize(module, action)
 * - Reads `req.user` (set by authentication middleware)
 * - Looks up the user's role via `roleId` (preferred)
 * - Checks the role's permissions for the specified module/action
 * - Fails closed: deny access if anything is missing
 */
const authorize = (moduleName, action) => {

    
  return async (req, res, next) => {
    try {
      // 401 if unauthenticated
      if (!req.user) {
        return next(new AppError(
          'Unauthenticated',
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_TYPES.AUTHENTICATION_ERROR
        ));
      }

      // Obtain actions for the module from aggregation using roleId
      const roleIdOrName = req.user.roleId;
      const actions = await getModuleActions(roleIdOrName, moduleName);

      // If no actions found for this role/module, deny access (fail-closed)
      if (!actions || !Array.isArray(actions)) {
        return next(new AppError(
          `Access denied to module: ${moduleName}`,
          HTTP_STATUS.FORBIDDEN,
          ERROR_TYPES.AUTHORIZATION_ERROR
        ));
      }

      // Check requested action
      if (!actions.includes(action)) {
        return next(new AppError(
          `Insufficient permissions to ${action} ${moduleName}`,
          HTTP_STATUS.FORBIDDEN,
          ERROR_TYPES.AUTHORIZATION_ERROR
        ));
      }

      // Authorized
      return next();
    } catch (err) {
      return next(new AppError(
        'Authorization failure',
        HTTP_STATUS.FORBIDDEN,
        ERROR_TYPES.AUTHORIZATION_ERROR
      ));
    }
  };
};

export default authorize;
