import { Schema, model } from "mongoose";

const applicationSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    userCV: {
      secure_url: {
        type: String,
        required: [true, "CV secure URL is required"],
      },
      public_id: {
        type: String,
        required: [true, "CV public ID is required"],
      },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "viewed", "in consideration", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt for tracking
  }
);

// Indexes for efficient querying
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ userId: 1 });
applicationSchema.index({ status: 1 });

export default model("Application", applicationSchema);
