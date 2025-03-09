import User from "../model/User.model.js";
import Company from "../model/Company.model.js";
import { ApiError, NotFoundError } from "../utils/errors/customErrors.js";
import asyncHandler from "../utils/errors/asyncHandler.js";

/**
 * Ban a user
 * @route POST /api/admin/users/:id/ban
 */
export const banUser = asyncHandler(async (req, res) => {
  // Verify requester is admin
  if (req.user.role !== "Admin") {
    throw new ApiError(403, "Not authorized to perform this action");
  }

  const { id } = req.params;

  // Find user
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if user is already banned
  if (user.bannedAt) {
    throw new ApiError(400, "User is already banned");
  }

  // Ban user
  user.bannedAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: "User banned successfully",
  });
});

/**
 * Unban a user
 * @route POST /api/admin/users/:id/unban
 */
export const unbanUser = asyncHandler(async (req, res) => {
  // Verify requester is admin
  if (req.user.role !== "Admin") {
    throw new ApiError(403, "Not authorized to perform this action");
  }

  const { id } = req.params;

  // Find user
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if user is not banned
  if (!user.bannedAt) {
    throw new ApiError(400, "User is not banned");
  }

  // Unban user
  user.bannedAt = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User unbanned successfully",
  });
});

/**
 * Ban a company
 * @route POST /api/admin/companies/:id/ban
 */
export const banCompany = asyncHandler(async (req, res) => {
  // Verify requester is admin
  if (req.user.role !== "Admin") {
    throw new ApiError(403, "Not authorized to perform this action");
  }

  const { id } = req.params;

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is already banned
  if (company.bannedAt) {
    throw new ApiError(400, "Company is already banned");
  }

  // Ban company
  company.bannedAt = new Date();
  await company.save();

  res.status(200).json({
    success: true,
    message: "Company banned successfully",
  });
});

/**
 * Unban a company
 * @route POST /api/admin/companies/:id/unban
 */
export const unbanCompany = asyncHandler(async (req, res) => {
  // Verify requester is admin
  if (req.user.role !== "Admin") {
    throw new ApiError(403, "Not authorized to perform this action");
  }

  const { id } = req.params;

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is not banned
  if (!company.bannedAt) {
    throw new ApiError(400, "Company is not banned");
  }

  // Unban company
  company.bannedAt = null;
  await company.save();

  res.status(200).json({
    success: true,
    message: "Company unbanned successfully",
  });
});

/**
 * Approve a company
 * @route POST /api/admin/companies/:id/approve
 */
export const approveCompany = asyncHandler(async (req, res) => {
  // Verify requester is admin
  if (req.user.role !== "Admin") {
    throw new ApiError(403, "Not authorized to perform this action");
  }

  const { id } = req.params;

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is already approved
  if (company.approvedByAdmin) {
    throw new ApiError(400, "Company is already approved");
  }

  // Approve company
  company.approvedByAdmin = true;
  await company.save();

  res.status(200).json({
    success: true,
    message: "Company approved successfully",
  });
});