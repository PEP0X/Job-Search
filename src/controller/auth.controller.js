import User from "../model/User.model.js";
import {
  generateOTP,
  generateAccessToken,
  generateRefreshToken,
  hashOTP,
  compareOTP,
} from "../utils/auth.js";
import { ApiError, NotFoundError } from "../utils/errors/customErrors.js";
import asyncHandler from "../utils/errors/asyncHandler.js";
import { config } from "../config/env.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../utils/email/emailService.js";
import {
  signupSchema,
  signinSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "../utils/validation/Auth.validation.js";

import passport from "passport";
import jwt from "jsonwebtoken";

// Signup controller
export const signup = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = signupSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { email } = req.body;
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(400, "Email already exists");

  // Create new user
  const user = new User(req.body);
  await user.save();

  // Generate OTP for email verification
  const otp = generateOTP();
  const hashedOTP = await hashOTP(otp);
  const expiresIn = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Add hashed OTP to user document
  user.OTP.push({
    code: hashedOTP,
    type: "confirmEmail",
    expiresIn,
  });
  await user.save();

  // Send verification email with plain OTP
  await sendVerificationEmail(user, otp);

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(201).json({
    success: true,
    message: "User registered successfully. Please verify your email.",
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isConfirmed: user.isConfirmed,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});

// Verify OTP controller
export const verifyOTP = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = verifyOTPSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { email, otp, type } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError("User not found");

  // Find the OTP records of the specified type
  const otpRecords = user.OTP.filter((record) => record.type === type);

  if (otpRecords.length === 0)
    throw new ApiError(400, "No OTP found for this action");

  // Check if any OTP matches
  let validOTP = false;
  let validOTPRecord = null;

  for (const record of otpRecords) {
    // Check if OTP is expired
    if (new Date() > new Date(record.expiresIn)) continue;

    // Compare the provided OTP with the hashed one
    const isMatch = await compareOTP(otp, record.code);
    if (isMatch) {
      validOTP = true;
      validOTPRecord = record;
      break;
    }
  }

  if (!validOTP)
    throw new ApiError(400, "Invalid or expired OTP");

  // If OTP is for email confirmation, mark user as confirmed
  if (type === "confirmEmail") {
    user.isConfirmed = true;

    // Send welcome email
    await sendWelcomeEmail(user);
  }

  // Remove all OTPs of this type
  user.OTP = user.OTP.filter((record) => record.type !== type);
  await user.save();

  res.status(200).json({
    success: true,
    message:
      type === "confirmEmail"
        ? "Email verified successfully"
        : "OTP verified successfully",
    isConfirmed: user.isConfirmed,
  });
});

// Forgot password controller
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError("User not found");

  // Generate OTP for password reset
  const otp = generateOTP();
  const hashedOTP = await hashOTP(otp);
  const expiresIn = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Add hashed OTP to user document
  user.OTP.push({
    code: hashedOTP,
    type: "forgetPassword",
    expiresIn,
  });
  await user.save();

  // Send password reset email with plain OTP
  await sendPasswordResetEmail(user, otp);

  res.status(200).json({
    success: true,
    message: "Password reset OTP sent to your email",
  });
});

// Reset password controller
export const resetPassword = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = resetPasswordSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { email, otp, newPassword } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError("User not found");

  // Find the OTP records of the specified type
  const otpRecords = user.OTP.filter(
    (record) => record.type === "forgetPassword"
  );

  if (otpRecords.length === 0)
    throw new ApiError(400, "No password reset OTP found");

  // Check if any OTP matches
  let validOTP = false;

  for (const record of otpRecords) {
    // Check if OTP is expired
    if (new Date() > new Date(record.expiresIn)) continue;

    // Compare the provided OTP with the hashed one
    const isMatch = await compareOTP(otp, record.code);
    if (isMatch) {
      validOTP = true;
      break;
    }
  }

  if (!validOTP)
    throw new ApiError(400, "Invalid or expired OTP");

  // Update password
  user.password = newPassword;

  // Remove all OTPs of this type
  user.OTP = user.OTP.filter((record) => record.type !== "forgetPassword");

  // Update credential change time
  user.changeCredentialTime = Date.now();

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

// Login controller
export const login = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = signinSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError("User not found");

  // Check if user is deleted
  if (user.deletedAt)
    throw new ApiError(403, "Account has been deleted");

  // Check if password is correct
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid)
    throw new ApiError(401, "Invalid credentials");

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isConfirmed: user.isConfirmed,
      role: user.role,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});

// Refresh token controller
export const refreshToken = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = refreshTokenSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { refreshToken: token } = req.body;

  try {
    // Verify refresh token
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

    // Find user by id
    const user = await User.findById(decoded.id);
    if (!user) throw new NotFoundError("User not found");

    // Check if user is deleted
    if (user.deletedAt)
      throw new ApiError(403, "Account has been deleted");

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Refresh token expired");
    }
    throw error;
  }
});

// Google Authentication
export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

// Google callback handler
export const googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, user) => {
    try {
      if (err) {
        return next(new ApiError(500, err.message || "Authentication error"));
      }

      if (!user) {
        return res.redirect(
          `${config.siteUrl}/auth/login?error=Authentication failed`
        );
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Redirect to frontend with tokens
      return res.redirect(
        `${config.siteUrl}/auth/social-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      return next(
        new ApiError(500, error.message || "Error in Google authentication")
      );
    }
  })(req, res, next);
};