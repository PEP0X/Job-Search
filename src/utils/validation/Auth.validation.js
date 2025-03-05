import Joi from "joi";

// User registration schema
export const signupSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  DOB: Joi.date()
    .max(new Date(new Date().setFullYear(new Date().getFullYear() - 18)))
    .required(), // Must be 18+
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .required(),
  gender: Joi.string().valid("Male", "Female").required(),
});

// User login schema
export const signinSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// OTP verification schema
export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  type: Joi.string().valid("confirmEmail", "forgetPassword").required(),
});

// Password reset schema
export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).required(),
});

// Refresh token schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});
