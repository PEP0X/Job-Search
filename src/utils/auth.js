import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Generate JWT tokens
export const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
export const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

// OTP generation and hashing
export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
export const hashOTP = async (otp) => await bcrypt.hash(otp, 10);
export const compareOTP = async (otp, hashedOTP) =>
  await bcrypt.compare(otp, hashedOTP);

// Mobile number encryption
export const encryptMobile = (mobile) => {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.ENCRYPTION_KEY, "hex"),
    Buffer.from(process.env.ENCRYPTION_IV, "hex")
  );
  return cipher.update(mobile, "utf8", "hex") + cipher.final("hex");
};
