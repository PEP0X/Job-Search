import { ApiError } from "../utils/errors/customErrors.js";

/**
 * Middleware to verify if the user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
  } else {
    next(new ApiError(403, "Access denied. Admin privileges required."));
  }
};