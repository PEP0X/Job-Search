import { Router } from "express";
import {
  updateUser,
  getUserProfile,
  getOtherUserProfile,
  updatePassword,
  uploadProfilePic,
  uploadCoverPic,
  deleteProfilePic,
  deleteCoverPic,
  deleteAccount
} from "../controller/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// User profile routes
router.put("/update", updateUser);
router.get("/profile", getUserProfile);
router.get("/:id/profile", getOtherUserProfile);
router.put("/update-password", updatePassword);

// Profile picture routes
router.post("/profile-pic", upload.image.single("profilePic"), uploadProfilePic);
router.delete("/profile-pic", deleteProfilePic);

// Cover picture routes
router.post("/cover-pic", upload.image.single("coverPic"), uploadCoverPic);
router.delete("/cover-pic", deleteCoverPic);

// Account management
router.delete("/delete", deleteAccount);

export default router;