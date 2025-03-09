import Chat from "../model/Chat.model.js";
import User from "../model/User.model.js";
import Company from "../model/Company.model.js";
import { ApiError, NotFoundError } from "../utils/errors/customErrors.js";
import asyncHandler from "../utils/errors/asyncHandler.js";

/**
 * Get chat history between two users
 * @route GET /api/chats/:userId
 */
export const getChatHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  // Validate if target user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  // Get pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Get chat history
  const chat = await Chat.getChatHistory(currentUserId, userId);

  // Apply pagination to messages
  const totalMessages = chat.messages ? chat.messages.length : 0;
  const paginatedMessages = chat.messages
    ? chat.messages
        .slice(
          Math.max(0, totalMessages - page * limit),
          totalMessages - (page - 1) * limit
        )
        .reverse()
    : [];

  res.status(200).json({
    success: true,
    chat: {
      _id: chat._id || null,
      senderId: chat.senderId || currentUserId,
      receiverId: chat.receiverId || userId,
      messages: paginatedMessages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit) || 1,
        totalItems: totalMessages,
        limit,
      },
    },
  });
});

/**
 * Send a message
 * @route POST /api/chats/:userId/messages
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;
  const currentUserId = req.user._id;

  if (!message || message.trim() === "") {
    throw new ApiError(400, "Message cannot be empty");
  }

  // Validate if target user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  // Find existing chat or create new one
  let chat = await Chat.findOne({
    $or: [
      { senderId: currentUserId, receiverId: userId },
      { senderId: userId, receiverId: currentUserId },
    ],
  });

  if (!chat) {
    chat = new Chat({
      senderId: currentUserId,
      receiverId: userId,
      messages: [],
    });
  }

  // Add message to chat
  chat.messages.push({
    message,
    senderId: currentUserId,
  });

  await chat.save();

  // Get the newly added message
  const newMessage = chat.messages[chat.messages.length - 1];

  // Emit socket event if available
  const io = req.app.get("io");
  if (io) {
    // Create a unique room ID for the chat (sorted user IDs to ensure consistency)
    const participants = [currentUserId.toString(), userId].sort();
    const roomId = `chat_${participants.join("_")}`;

    io.to(roomId).emit("newMessage", {
      _id: newMessage._id,
      message: newMessage.message,
      senderId: newMessage.senderId,
      timestamp: newMessage.timestamp,
    });
  }

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: newMessage,
  });
});

/**
 * Get all chats for current user
 * @route GET /api/chats
 */
export const getUserChats = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  // Find all chats where current user is sender or receiver
  const chats = await Chat.find({
    $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
  })
    .populate("senderId", "firstName lastName email profilePic")
    .populate("receiverId", "firstName lastName email profilePic");

  // Format chats for response
  const formattedChats = chats.map((chat) => {
    // Determine the other user in the chat
    const otherUser =
      chat.senderId._id.toString() === currentUserId.toString()
        ? chat.receiverId
        : chat.senderId;

    // Get the last message
    const lastMessage =
      chat.messages.length > 0
        ? chat.messages[chat.messages.length - 1]
        : null;

    return {
      _id: chat._id,
      user: {
        _id: otherUser._id,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        email: otherUser.email,
        profilePic: otherUser.profilePic,
      },
      lastMessage: lastMessage
        ? {
            message: lastMessage.message,
            senderId: lastMessage.senderId,
            timestamp: lastMessage.timestamp,
          }
        : null,
      unreadCount: chat.messages.filter(
        (msg) =>
          msg.senderId.toString() !== currentUserId.toString() && !msg.read
      ).length,
    };
  });

  res.status(200).json({
    success: true,
    chats: formattedChats,
  });
});

/**
 * Verify if user can initiate chat with HR/company owner
 * @route GET /api/chats/verify/:companyId
 */
export const verifyHRChat = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  // Find company
  const company = await Company.findById(companyId)
    .populate("createdBy", "firstName lastName email _id")
    .populate("HRs", "firstName lastName email _id");

  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is active
  if (company.deletedAt || company.bannedAt) {
    throw new ApiError(400, "Company is not active");
  }

  // Get company HRs and owner
  const companyContacts = [
    {
      _id: company.createdBy._id,
      firstName: company.createdBy.firstName,
      lastName: company.createdBy.lastName,
      email: company.createdBy.email,
      role: "Owner",
    },
    ...company.HRs.map((hr) => ({
      _id: hr._id,
      firstName: hr.firstName,
      lastName: hr.lastName,
      email: hr.email,
      role: "HR",
    })),
  ];

  res.status(200).json({
    success: true,
    companyContacts,
  });
});