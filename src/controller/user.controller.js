import {
  updateSchema,
  passwordSchema,
} from "../utils/validation/User.validation.js";
import User from "../model/User.model.js";
import cloudinaryV2 from "../config/cloudinary.js";
import asyncHandler from "../utils/errors/asyncHandler.js";
import { ApiError, NotFoundError } from "../utils/errors/customErrors.js";

/**
 * Update user profile information
 * @route PUT /api/users/profile
 * @access Private - Requires authentication
 * @description Updates the authenticated user's profile information
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { error } = updateSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const updates = {};
  for (const key in req.body) {
    if (updateSchema.describe().keys[key]) updates[key] = req.body[key];
  }

  updates.updatedBy = req.user.id;
  Object.assign(user, updates);
  await user.save();

  res.json({
    message: "User updated successfully",
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      gender: user.gender,
      DOB: user.DOB,
      mobileNumber: user.mobileNumber,
      role: user.role,
      profilePic: user.profilePic,
      coverPic: user.coverPic,
      updatedAt: user.updatedAt,
    },
  });
});

/**
 * Get authenticated user's profile
 * @route GET /api/users/profile
 * @access Private - Requires authentication
 * @description Retrieves the complete profile of the authenticated user
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if user is deleted
  if (user.deletedAt) {
    throw new ApiError(403, "Account has been deleted");
  }

  // Decrypt mobile number if it exists
  let decryptedMobileNumber = null;
  if (user.mobileNumber) {
    try {
      decryptedMobileNumber = user.decryptMobileNumber();
    } catch (error) {
      console.error("Error decrypting mobile number:", error);
    }
  }

  res.json({
    success: true,
    user: {
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      gender: user.gender,
      DOB: user.DOB,
      mobileNumber: decryptedMobileNumber || user.mobileNumber,
      role: user.role,
      isConfirmed: user.isConfirmed,
      profilePic: user.profilePic,
      coverPic: user.coverPic,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

/**
 * Get another user's public profile
 * @route GET /api/users/:id
 * @access Public
 * @description Retrieves the public profile information of another user
 */
export const getOtherUserProfile = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Check if userId is a valid ObjectId
  if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError("User not found or inactive");
  }

  // Check if user is deleted
  if (user.deletedAt) {
    throw new NotFoundError("User not found");
  }

  // Return only public fields
  res.json({
    success: true,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePic: user.profilePic,
      coverPic: user.coverPic,
    },
  });
});

/**
 * Update user password
 * @route PUT /api/users/password
 * @access Private - Requires authentication
 * @description Updates the authenticated user's password after verifying current password
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { error } = passwordSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, "Current password is incorrect");
  }

  // Update password
  user.password = newPassword;
  user.changeCredentialTime = new Date();
  await user.save();

  res.json({ message: "Password updated successfully" });
});

/**
 * Upload user profile picture
 * @route POST /api/users/profile-picture
 * @access Private - Requires authentication
 * @description Uploads a new profile picture for the authenticated user
 */
export const uploadProfilePic = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Delete old profile picture from Cloudinary if exists
  if (user.profilePic && user.profilePic.public_id) {
    await cloudinaryV2.uploader.destroy(user.profilePic.public_id);
  }

  // Update user with new profile picture
  user.profilePic = {
    secure_url: req.file.path,
    public_id: req.file.filename,
  };

  await user.save();

  res.json({
    success: true,
    message: "Profile picture uploaded successfully",
    profilePic: user.profilePic,
  });
});

/**
 * Upload user cover picture
 * @route POST /api/users/cover-picture
 * @access Private - Requires authentication
 * @description Uploads a new cover picture for the authenticated user
 */
export const uploadCoverPic = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Delete old cover picture from Cloudinary if exists
  if (user.coverPic && user.coverPic.public_id) {
    await cloudinaryV2.uploader.destroy(user.coverPic.public_id);
  }

  // Update user with new cover picture
  user.coverPic = {
    secure_url: req.file.path,
    public_id: req.file.filename,
  };

  await user.save();

  res.json({
    message: "Cover picture uploaded successfully",
    coverPic: user.coverPic,
  });
});

/**
 * Delete user profile picture
 * @route DELETE /api/users/profile-picture
 * @access Private - Requires authentication
 * @description Removes the profile picture of the authenticated user
 */
export const deleteProfilePic = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Delete profile picture from Cloudinary if exists
  if (user.profilePic && user.profilePic.public_id) {
    await cloudinaryV2.uploader.destroy(user.profilePic.public_id);
  }

  // Remove profile picture from user
  user.profilePic = undefined;
  await user.save();

  res.json({ message: "Profile picture deleted successfully" });
});

/**
 * Delete user cover picture
 * @route DELETE /api/users/cover-picture
 * @access Private - Requires authentication
 * @description Removes the cover picture of the authenticated user
 */
export const deleteCoverPic = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Delete cover picture from Cloudinary if exists
  if (user.coverPic && user.coverPic.public_id) {
    await cloudinaryV2.uploader.destroy(user.coverPic.public_id);
  }

  // Remove cover picture from user
  user.coverPic = undefined;
  await user.save();

  res.json({ message: "Cover picture deleted successfully" });
});

/**
 * Soft delete user account
 * @route DELETE /api/users/account
 * @access Private - Requires authentication
 * @description Performs a soft delete of the authenticated user's account
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Set deletedAt to current date
  user.deletedAt = new Date();
  await user.save();

  res.json({ message: "Account deleted successfully" });
});
