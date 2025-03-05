import jwt from "jsonwebtoken";
import { AuthorizationError, ApiError } from "../utils/errors/customErrors.js";
import User from "../model/User.model.js";
import { generateAccessToken } from "../utils/auth.js";
import { config } from "../config/env.js";

/**
 * Middleware to handle token refresh when access token expires
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const handleTokenExpiration = async (req, res, next) => {
  try {
    // Get refresh token from cookies or authorization header
    const refreshToken =
      req.cookies?.refreshToken ||
      (req.headers.authorization &&
        req.headers.authorization.startsWith("Refresh ") &&
        req.headers.authorization.split(" ")[1]);

    if (!refreshToken) {
      return next(new AuthorizationError("Refresh token not provided"));
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.secret);

    // Find user by id
    const user = await User.findById(decoded.id);

    // Check if user exists
    if (!user) {
      return next(new AuthorizationError("User not found"));
    }

    // Check if user is deleted
    if (user.deletedAt) {
      return next(new AuthorizationError("Account has been deleted"));
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    // Add new token to response headers
    res.setHeader("X-New-Access-Token", newAccessToken);

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new AuthorizationError("Refresh token expired, please login again")
      );
    }
    if (error.name === "JsonWebTokenError") {
      return next(new AuthorizationError("Invalid refresh token"));
    }
    next(new ApiError(500, error.message || "Error refreshing token"));
  }
};

/**
 * Error handler middleware specifically for token errors
 * This middleware should be used after routes that require authentication
 */
export const tokenErrorHandler = (err, req, res, next) => {
  if (err instanceof AuthorizationError && err.message === "Token expired") {
    // Instead of sending an error, trigger the refresh token flow
    return handleTokenExpiration(req, res, next);
  }

  // Pass other errors to the next error handler
  next(err);
};
