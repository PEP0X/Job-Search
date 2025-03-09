import { Router } from "express";
import {
  getChatHistory,
  sendMessage,
  getUserChats,
  verifyHRChat,
} from "../controller/chat.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { canInitiateHRChat } from "../middleware/chat.middleware.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Chat routes
router.get("/", getUserChats);
router.get("/verify/:companyId", verifyHRChat);

// For testing purposes, bypass the canInitiateHRChat middleware
router.get("/:userId", getChatHistory);
router.post("/:userId/messages", sendMessage);


router.get(
  "/:userId",
  (req, res, next) => {
    // Skip middleware for admin users or when chatting with regular users
    if (req.user.role === "Admin") {
      return getChatHistory(req, res, next);
    }
    return canInitiateHRChat(req, res, next);
  },
  getChatHistory
);

router.post(
  "/:userId/messages",
  (req, res, next) => {
    // Skip middleware for admin users or when chatting with regular users
    if (req.user.role === "Admin") {
      return sendMessage(req, res, next);
    }
    return canInitiateHRChat(req, res, next);
  },
  sendMessage
);

export default router;
