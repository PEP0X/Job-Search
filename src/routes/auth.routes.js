import { Router } from "express";
import {
  signup,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
} from "../controller/auth.controller.js";

const router = Router();

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/signin", login);
// router.get("/google", authController.googleAuth);
// router.get("/google/callback", authController.googleCallback);
router.post("/forget-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);

export default router;
