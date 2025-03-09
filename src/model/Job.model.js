import mongoose from "mongoose";
import { Schema, model } from "mongoose";

const JobLocations = ["onsite", "remotely", "hybrid"];
const workingTimes = ["part-time", "full-time"];
const seniorityLevels = [
  "fresh",
  "Junior",
  "Mid-Level",
  "Senior",
  "Team-Lead",
  "CTO",
];

const JobSchema = new Schema(
  {
    jobTitle: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      index: true, // Index for search optimization
    },
    jobLocation: {
      type: String,
      required: [true, "Job location is required"],
      enum: JobLocations,
      index: true, // Index for filtering
    },
    workingTime: {
      type: String,
      required: [true, "Working time is required"],
      enum: workingTimes,
      index: true, // Index for filtering
    },
    seniorityLevel: {
      type: String,
      required: [true, "Seniority level is required"],
      enum: seniorityLevels,
      index: true, // Index for filtering
    },
    jobDescription: {
      type: String,
      required: [true, "Job description is required"],
    },
    technicalSkills: {
      type: [String],
      required: [true, "Technical skills are required"],
      validate: {
        validator: function (skills) {
          return skills.length > 0; // Array have at least one skill
        },
        message: "At least one technical skill is required",
      },
      index: true, // Index for search by skills
    },
    softSkills: {
      type: [String],
      required: [true, "Soft skills are required"],
      validate: {
        // Array have at least one skill
        validator: function (skills) {
          return skills.length > 0;
        },
        message: "At least one soft skill is required",
      },
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    closed: {
      type: Boolean,
      default: false,
      index: true, // Index for filtering active/closed jobs
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true, // Index for filtering by company
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for common filtering scenarios
JobSchema.index({ companyId: 1, closed: 1, seniorityLevel: 1 });
JobSchema.index({ jobLocation: 1, workingTime: 1 });

// Method to check if job is active (not deleted)
JobSchema.methods.isActive = function () {
  return !this.deletedAt && !this.closed;
};

// Static method to find active jobs
JobSchema.statics.findActive = function () {
  return this.find({
    deletedAt: null,
    closed: false,
  });
};

// Pre-hook for findOneAndDelete and deleteOne operations
JobSchema.pre(
  ["findOneAndDelete", "deleteOne"],
  { document: false, query: true },
  async function () {
    const job = await this.model.findOne(this.getFilter());
    if (!job) return;

    // Delete all applications for this job
    await mongoose.model("Application").deleteMany({ jobId: job._id });
  }
);

// Pre-hook for document middleware (when using save() for soft delete)
JobSchema.pre("save", async function (next) {
  // If this is a soft delete operation
  if (this.isModified("deletedAt") && this.deletedAt) {
    try {
      // Update all pending applications to rejected
      await mongoose
        .model("Application")
        .updateMany(
          { jobId: this._id, status: { $nin: ["accepted", "rejected"] } },
          { $set: { status: "rejected" } }
        );
    } catch (error) {
      console.error("Error in Job soft delete hook:", error);
    }
  }
  next();
});

const Job = model("Job", JobSchema);

export default Job;
