import Job from "../model/Job.model.js";
import Company from "../model/Company.model.js";
import Application from "../model/Application.model.js";
import User from "../model/User.model.js";
import { ApiError, NotFoundError } from "../utils/errors/customErrors.js";
import asyncHandler from "../utils/errors/asyncHandler.js";

import {
  createJobSchema,
  updateJobSchema,
  getJobsSchema,
  updateApplicationStatusSchema,
} from "../utils/validation/Job.validation.js";
import {
  sendApplicationConfirmation,
  sendApplicationStatusUpdate,
} from "../utils/email/emailService.js";

/**
 * Create a new job
 * @route POST /api/jobs
 */
export const createJob = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = createJobSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { companyId } = req.body;

  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is deleted or banned
  if (company.deletedAt || company.bannedAt) {
    throw new ApiError(400, "Company is not active");
  }

  // Check if user is authorized (company creator or HR)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to create jobs for this company");
  }

  // Create new job
  const job = new Job({
    ...req.body,
    addedBy: req.user._id,
  });

  await job.save();

  res.status(201).json({
    success: true,
    message: "Job created successfully",
    job,
  });
});

/**
 * Update job details
 * @route PUT /api/jobs/:id
 */
export const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error } = updateJobSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  // Find job
  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError("Job not found");
  }

  // Check if job is deleted
  if (job.deletedAt) {
    throw new ApiError(400, "Job has been deleted");
  }

  // Get company
  const company = await Company.findById(job.companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if user is authorized (company creator or HR)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to update jobs for this company");
  }

  // Update job
  Object.keys(req.body).forEach((key) => {
    if (updateJobSchema.describe().keys[key]) {
      job[key] = req.body[key];
    }
  });

  // Set updatedBy to current user
  job.updatedBy = req.user._id;

  await job.save();

  res.status(200).json({
    success: true,
    message: "Job updated successfully",
    job,
  });
});

/**
 * Soft delete a job
 * @route DELETE /api/jobs/:id
 */
export const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find job
  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError("Job not found");
  }

  // Check if job is already deleted
  if (job.deletedAt) {
    throw new ApiError(400, "Job already deleted");
  }

  // Get company
  const company = await Company.findById(job.companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if user is authorized (company creator or HR)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to delete jobs for this company");
  }

  // Soft delete job
  job.deletedAt = new Date();
  await job.save();

  // Update related applications to rejected status
  await Application.updateMany(
    { jobId: id, status: { $nin: ["accepted", "rejected"] } },
    { status: "rejected" }
  );

  res.status(200).json({
    success: true,
    message: "Job deleted successfully",
  });
});

/**
 * Get company jobs
 * @route GET /api/companies/:companyId/jobs
 */
export const getCompanyJobs = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  // Validate query parameters
  const { error, value } = getJobsSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { page, limit, sort } = value;
  const skip = (page - 1) * limit;

  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Build query
  const query = { companyId, deletedAt: null };

  // Apply filters if provided
  if (value.workingTime) query.workingTime = value.workingTime;
  if (value.jobLocation) query.jobLocation = value.jobLocation;
  if (value.seniorityLevel) query.seniorityLevel = value.seniorityLevel;
  if (value.jobTitle)
    query.jobTitle = { $regex: value.jobTitle, $options: "i" };
  if (value.technicalSkills) {
    const skills = value.technicalSkills
      .split(",")
      .map((skill) => skill.trim());
    query.technicalSkills = { $in: skills };
  }

  // Get jobs with pagination and sorting
  const jobs = await Job.find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .populate("addedBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email");

  // Get total count for pagination
  const totalJobs = await Job.countDocuments(query);

  res.status(200).json({
    success: true,
    jobs: {
      data: jobs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
        totalItems: totalJobs,
        limit,
      },
    },
  });
});

/**
 * Get all jobs with filters
 * @route GET /api/jobs
 */
export const getAllJobs = asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = getJobsSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { page, limit, sort } = value;
  const skip = (page - 1) * limit;

  // Build query
  const query = { deletedAt: null, closed: false };

  // Apply filters if provided
  if (value.workingTime) query.workingTime = value.workingTime;
  if (value.jobLocation) query.jobLocation = value.jobLocation;
  if (value.seniorityLevel) query.seniorityLevel = value.seniorityLevel;
  if (value.jobTitle)
    query.jobTitle = { $regex: value.jobTitle, $options: "i" };
  if (value.technicalSkills) {
    const skills = value.technicalSkills
      .split(",")
      .map((skill) => skill.trim());
    query.technicalSkills = { $in: skills };
  }
  if (value.companyId) query.companyId = value.companyId;

  // Get jobs with pagination and sorting
  const jobs = await Job.find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .populate("companyId", "companyName logo industry")
    .populate("addedBy", "firstName lastName");

  // Get total count for pagination
  const totalJobs = await Job.countDocuments(query);

  res.status(200).json({
    success: true,
    jobs: {
      data: jobs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
        totalItems: totalJobs,
        limit,
      },
    },
  });
});

/**
 * Get job applications
 * @route GET /api/jobs/:jobId/applications
 */
export const getJobApplications = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Find job
  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError("Job not found");
  }

  // Get company
  const company = await Company.findById(job.companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if user is authorized (company creator or HR)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to view applications for this job");
  }

  // Get applications with pagination
  const applications = await Application.find({ jobId })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate("userId", "firstName lastName email profilePic");

  // Get total count for pagination
  const totalApplications = await Application.countDocuments({ jobId });

  res.status(200).json({
    success: true,
    applications: {
      data: applications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalApplications / limit),
        totalItems: totalApplications,
        limit,
      },
    },
  });
});

/**
 * Apply to job
 * @route POST /api/jobs/:jobId/apply
 */
export const applyToJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  // Check if CV was uploaded
  if (!req.file) {
    throw new ApiError(400, "CV is required");
  }

  // Check if user role is "User"
  if (req.user.role !== "User") {
    throw new ApiError(403, "Only users can apply to jobs");
  }

  // Find job
  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError("Job not found");
  }

  // Check if job is active
  if (job.deletedAt || job.closed) {
    throw new ApiError(400, "This job is no longer accepting applications");
  }

  // Check if user already applied to this job
  const existingApplication = await Application.findOne({
    jobId,
    userId: req.user._id,
  });

  if (existingApplication) {
    throw new ApiError(400, "You have already applied to this job");
  }

  // Create application
  const application = new Application({
    jobId,
    userId: req.user._id,
    userCV: {
      secure_url: req.file.path,
      public_id: req.file.filename,
    },
  });

  await application.save();

  // Get company and job details for notification
  const company = await Company.findById(job.companyId);

  // Send confirmation email to user
  await sendApplicationConfirmation(req.user, job, company);

  // Emit socket event for notification to company HRs
  const io = req.app.get("io");
  if (io) {
    // Get HR IDs (company creator and all HRs)
    const hrIds = [
      company.createdBy.toString(),
      ...company.HRs.map((hr) => hr.toString()),
    ];

    // Create notification data
    const notificationData = {
      type: "application",
      companyId: company._id.toString(),
      hrIds,
      jobId: job._id.toString(),
      jobTitle: job.jobTitle,
      applicantId: req.user._id.toString(),
      applicantName: `${req.user.firstName} ${req.user.lastName}`,
      applicationId: application._id.toString(),
      timestamp: new Date(),
    };

    // Emit to all HRs' personal rooms
    hrIds.forEach((hrId) => {
      io.to(hrId).emit("notification", notificationData);
    });

    // Also emit to company room if you have one
    io.to(`company_${company._id}`).emit("notification", notificationData);
  }

  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    application: {
      _id: application._id,
      jobId: application.jobId,
      status: application.status,
      createdAt: application.createdAt,
    },
  });
});

/**
 * Update application status
 * @route PUT /api/jobs/applications/:id/status
 */
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate request body
  const { error } = updateApplicationStatusSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  // Find application
  const application = await Application.findById(id)
    .populate({
      path: "jobId",
      populate: {
        path: "companyId",
      },
    })
    .populate("userId");

  if (!application) {
    throw new NotFoundError("Application not found");
  }

  // Get job and company
  const job = application.jobId;
  const company = job.companyId;

  // Check if user is authorized (company creator or HR)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to update application status");
  }

  // Update status
  application.status = status;
  await application.save();

  // Send email notification to applicant
  const user = application.userId;
  await sendApplicationStatusUpdate(user, job, company, status);

  res.status(200).json({
    success: true,
    message: "Application status updated successfully",
    application,
  });
});

/**
 * Get job details
 * @route GET /api/jobs/:id
 */
export const getJobDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find job
  const job = await Job.findOne({ _id: id, deletedAt: null })
    .populate("companyId", "companyName logo industry address companyEmail")
    .populate("addedBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email");

  if (!job) {
    throw new NotFoundError("Job not found");
  }

  // Check if user has applied to this job
  let hasApplied = false;
  let applicationStatus = null;

  if (req.user && req.user.role === "User") {
    const application = await Application.findOne({
      jobId: id,
      userId: req.user._id,
    });

    if (application) {
      hasApplied = true;
      applicationStatus = application.status;
    }
  }

  res.status(200).json({
    success: true,
    job,
    application: {
      hasApplied,
      status: applicationStatus,
    },
  });
});

/**
 * Get user applications
 * @route GET /api/users/applications
 */
export const getUserApplications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status;

  // Build query
  const query = { userId: req.user._id };

  // Filter by status if provided
  if (
    status &&
    ["pending", "reviewing", "accepted", "rejected"].includes(status)
  ) {
    query.status = status;
  }

  // Get applications with pagination
  const applications = await Application.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate({
      path: "jobId",
      select: "jobTitle companyId seniorityLevel workingTime jobLocation",
      populate: {
        path: "companyId",
        select: "companyName logo",
      },
    });

  // Get total count for pagination
  const totalApplications = await Application.countDocuments(query);

  res.status(200).json({
    success: true,
    applications: {
      data: applications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalApplications / limit),
        totalItems: totalApplications,
        limit,
      },
    },
  });
});

/**
 * Close a job (stop accepting applications)
 * @route PUT /api/jobs/:id/close
 */
export const closeJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find job
  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError("Job not found");
  }

  // Check if job is deleted
  if (job.deletedAt) {
    throw new ApiError(400, "Job has been deleted");
  }

  // Get company
  const company = await Company.findById(job.companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if user is authorized (company creator or HR)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to close jobs for this company");
  }

  // Close job
  job.closed = true;
  await job.save();

  res.status(200).json({
    success: true,
    message: "Job closed successfully",
  });
});

/**
 * Reopen a job (start accepting applications again)
 * @route PUT /api/jobs/:id/reopen
 */
export const reopenJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find job
  const job = await Job.findById(id);
  if (!job) {
    throw new NotFoundError("Job not found");
  }

  // Check if job is deleted
  if (job.deletedAt) {
    throw new ApiError(400, "Job has been deleted");
  }

  // Get company
  const company = await Company.findById(job.companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if user is authorized (company creator or HR)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to reopen jobs for this company");
  }

  // Reopen job
  job.closed = false;
  await job.save();

  res.status(200).json({
    success: true,
    message: "Job reopened successfully",
  });
});
