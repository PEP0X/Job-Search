import { Router } from "express";
import {
  banUser,
  unbanUser,
  banCompany,
  unbanCompany,
  approveCompany,
} from "../controller/admin.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/admin.middleware.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(isAdmin);

// User management routes
router.post("/users/:id/ban", banUser);
router.post("/users/:id/unban", unbanUser);

// Company management routes
router.post("/companies/:id/ban", banCompany);
router.post("/companies/:id/unban", unbanCompany);
router.post("/companies/:id/approve", approveCompany);

export default router;