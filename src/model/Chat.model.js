import { Schema, model } from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver is required"],
    },
    messages: [
      {
        message: {
          type: String,
          required: [true, "Message is required"],
        },
        senderId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: [true, "Sender is required"],
          validate: {
            validator: function (v) {
              const chat = this.parent();
              return (
                v.toString() === chat.senderId.toString() ||
                v.toString() === chat.receiverId.toString()
              );
            },
            message: "Sender must be one of the chat participants",
          },
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to retrieve chat history between two users
chatSchema.statics.getChatHistory = async function (userId1, userId2) {
  // Find a chat where userId1 and userId2 are either sender or receiver
  const chat = await this.findOne({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 },
    ],
  }).populate("messages.senderId", "username email"); 

  // If no chat exists, return an empty chat object
  if (!chat) {
    return {
      senderId: userId1,
      receiverId: userId2,
      messages: [],
      createdAt: null,
      updatedAt: null,
    };
  }

  return chat;
};

// Indexes for efficient querying
chatSchema.index({ senderId: 1, receiverId: 1 });
chatSchema.index({ receiverId: 1, senderId: 1 });

module.exports = model("Chat", chatSchema);
