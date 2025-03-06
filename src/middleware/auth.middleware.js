import jwt from 'jsonwebtoken';
import { AuthorizationError, ApiError } from '../utils/errors/customErrors.js';
import User from '../model/User.model.js';
import { config } from '../config/env.js';

/**
 * Middleware to verify JWT access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AuthorizationError('No token provided'));
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Find user by id
    const user = await User.findById(decoded.id);
    
    // Check if user exists
    if (!user) {
      return next(new AuthorizationError('User not found'));
    }
    
    // Check if token was issued before password change
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    if (user.changeCredentialTime && tokenIssuedAt < user.changeCredentialTime) {
      return next(new AuthorizationError('Token expired due to credential change'));
    }
    
    // Check if user is deleted
    if (user.deletedAt) {
      return next(new AuthorizationError('Account has been deleted'));
    }
    
    // Add user to request object
    req.user = user;
    // Add string version of _id as id for convenience and consistency
    req.user.id = user._id.toString();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AuthorizationError('Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AuthorizationError('Invalid token'));
    }
    next(new ApiError(500, error.message || 'Error verifying token'));
  }
};

/**
 * Middleware to check if user has required role
 * @param {String|Array} roles - Required role(s)
 * @returns {Function} Middleware function
 */
export const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('User not authenticated'));
    }
    
    // Convert roles to array if it's a single string
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(`Role ${req.user.role} is not authorized to access this resource`)
      );
    }
    
    next();
  };
};

/**
 * Middleware to check if user account is active (not banned or deleted)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const isActiveAccount = (req, res, next) => {
  if (!req.user) {
    return next(new AuthorizationError('User not authenticated'));
  }
  
  if (req.user.deletedAt) {
    return next(new AuthorizationError('Account has been deleted'));
  }
  
  next();
};

/**
 * Middleware to check if user is the owner of a resource
 * @param {String} paramIdField - Request parameter field containing resource ID
 * @param {String} modelName - Model name to check ownership against
 * @returns {Function} Middleware function
 */
export const isOwner = (paramIdField, modelName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AuthorizationError('User not authenticated'));
      }
      
      const resourceId = req.params[paramIdField];
      if (!resourceId) {
        return next(new ApiError(400, `${paramIdField} parameter is required`));
      }
      
      // Dynamically import the model
      const Model = (await import(`../model/${modelName}.model.js`)).default;
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return next(new ApiError(404, 'Resource not found'));
      }
      
      // Check ownership based on common fields
      const ownerId = resource.createdBy || resource.userId || resource.user;
      
      if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
        return next(new AuthorizationError('Not authorized to access this resource'));
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      next(new ApiError(500, error.message || 'Error checking resource ownership'));
    }
  };
};