import User from "../model/User.model.js";
import { generateOTP, generateAccessToken, generateRefreshToken, hashOTP, compareOTP } from "../utils/auth.js";
import { ApiError } from "../utils/errors/customErrors.js";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../utils/email/emailService.js";
import {
  signupSchema,
  signinSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "../utils/validation/Auth.validation.js";

// Signup controller
export const signup = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = signupSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email } = req.body;
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already exists" });

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
        isConfirmed: user.isConfirmed
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error creating user"));
  }
};

// Verify OTP controller
export const verifyOTP = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = verifyOTPSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, otp, type } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Find the OTP records of the specified type
    const otpRecords = user.OTP.filter(record => record.type === type);
    
    if (otpRecords.length === 0) 
      return res.status(400).json({ error: "No OTP found for this action" });
    
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
    
    if (!validOTP) return res.status(400).json({ error: "Invalid or expired OTP" });

    // If OTP is for email confirmation, mark user as confirmed
    if (type === "confirmEmail") {
      user.isConfirmed = true;
      
      // Send welcome email
      await sendWelcomeEmail(user);
    }

    // Remove all OTPs of this type
    user.OTP = user.OTP.filter(record => record.type !== type);
    await user.save();

    res.status(200).json({
      success: true,
      message: type === "confirmEmail" 
        ? "Email verified successfully" 
        : "OTP verified successfully",
      isConfirmed: user.isConfirmed
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error verifying OTP"));
  }
};

// Forgot password controller
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

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
  } catch (error) {
    next(new ApiError(500, error.message || "Error sending password reset OTP"));
  }
};

// Reset password controller
export const resetPassword = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, otp, newPassword } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Find the OTP records of the specified type
    const otpRecords = user.OTP.filter(record => record.type === "forgetPassword");
    
    if (otpRecords.length === 0) 
      return res.status(400).json({ error: "No password reset OTP found" });
    
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
    
    if (!validOTP) return res.status(400).json({ error: "Invalid or expired OTP" });

    // Update password
    user.password = newPassword;
    
    // Remove all OTPs of this type
    user.OTP = user.OTP.filter(record => record.type !== "forgetPassword");

    // Update credential change time
    user.changeCredentialTime = Date.now();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error resetting password"));
  }
};

// Login controller
export const login = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = signinSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if user is deleted
    if (user.deletedAt) return res.status(403).json({ error: "Account has been deleted" });

    // Check if password is correct
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials" });

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
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error logging in"));
  }
};

// Refresh token controller
export const refreshToken = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = refreshTokenSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { refreshToken: token } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if user is deleted
    if (user.deletedAt) return res.status(403).json({ error: "Account has been deleted" });

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Refresh token expired" });
    }
    next(new ApiError(500, error.message || "Error refreshing token"));
  }
};