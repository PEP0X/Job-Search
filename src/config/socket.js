import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./env.js";
import User from "../model/User.model.js";

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // In production, restrict to your frontend domain
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error("Authentication error: Token not provided"));
      }
      
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Find user
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }
      
      if (user.deletedAt || user.bannedAt) {
        return next(new Error("Authentication error: Account is not active"));
      }
      
      // Attach user to socket
      socket.user = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      };
      
      next();
    } catch (error) {
      return next(new Error(`Authentication error: ${error.message}`));
    }
  });

  // Store online users
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user._id}`);
    
    // Add user to online users
    onlineUsers.set(socket.user._id.toString(), socket.id);
    
    // Join personal room for direct messages
    socket.join(socket.user._id.toString());
    
    // Emit online status to all users
    io.emit("userStatus", {
      userId: socket.user._id,
      status: "online",
    });

    // Handle join chat room
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.user._id} joined chat: ${chatId}`);
    });

    // Handle private message
    socket.on("privateMessage", async (data) => {
      try {
        const { receiverId, message } = data;
        
        // Create a unique room ID for the chat (sorted user IDs to ensure consistency)
        const participants = [socket.user._id.toString(), receiverId].sort();
        const roomId = `chat_${participants.join('_')}`;
        
        // Join the room if not already joined
        socket.join(roomId);
        
        // Message object
        const messageObj = {
          senderId: socket.user._id,
          message,
          timestamp: new Date(),
        };
        
        // Save message to database (handled by chat controller)
        socket.to(roomId).emit("newMessage", messageObj);
        
        // If receiver is online, send notification
        if (onlineUsers.has(receiverId)) {
          io.to(onlineUsers.get(receiverId)).emit("messageNotification", {
            senderId: socket.user._id,
            senderName: `${socket.user.firstName} ${socket.user.lastName}`,
            message: message.substring(0, 30) + (message.length > 30 ? "..." : ""),
          });
        }
      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle application notification
    socket.on("applicationNotification", (data) => {
      try {
        const { companyId, hrIds, jobTitle, applicantName } = data;
        
        // Notify all HRs of the company
        hrIds.forEach(hrId => {
          if (onlineUsers.has(hrId)) {
            io.to(onlineUsers.get(hrId)).emit("newApplication", {
              companyId,
              jobTitle,
              applicantName,
              timestamp: new Date(),
            });
          }
        });
      } catch (error) {
        console.error("Error sending application notification:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user._id}`);
      
      // Remove user from online users
      onlineUsers.delete(socket.user._id.toString());
      
      // Emit offline status to all users
      io.emit("userStatus", {
        userId: socket.user._id,
        status: "offline",
      });
    });
  });

  return io;
};

export default initializeSocketIO;