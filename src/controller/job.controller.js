import Job from "../model/Job.model.js";
import Company from "../model/Company.model.js";
import Application from "../model/Application.model.js";
import { ApiError } from "../utils/errors/customErrors.js";
import cloudinaryV2 from "../config/cloudinary.js";
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
import User from "../model/User.model.js";

/**
 * Create a new job
 * @route POST /api/jobs
 */
export const createJob = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = createJobSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { companyId } = req.body;

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if company is deleted or banned
    if (company.deletedAt || company.bannedAt) {
      return next(new ApiError(400, "Company is not active"));
    }

    // Check if user is authorized (company creator or HR)
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to create jobs for this company")
      );
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
  } catch (error) {
    next(new ApiError(500, error.message || "Error creating job"));
  }
};

/**
 * Update job details
 * @route PUT /api/jobs/:id
 */
export const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error } = updateJobSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    // Find job
    const job = await Job.findById(id);
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    // Check if job is deleted
    if (job.deletedAt) {
      return next(new ApiError(400, "Job has been deleted"));
    }

    // Get company
    const company = await Company.findById(job.companyId);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if user is authorized (company creator or HR)
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to update jobs for this company")
      );
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
  } catch (error) {
    next(new ApiError(500, error.message || "Error updating job"));
  }
};

/**
 * Soft delete a job
 * @route DELETE /api/jobs/:id
 */
export const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find job
    const job = await Job.findById(id);
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    // Check if job is already deleted
    if (job.deletedAt) {
      return next(new ApiError(400, "Job already deleted"));
    }

    // Get company
    const company = await Company.findById(job.companyId);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if user is authorized (company creator or HR)
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to delete jobs for this company")
      );
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
  } catch (error) {
    next(new ApiError(500, error.message || "Error deleting job"));
  }
};

/**
 * Get company jobs
 * @route GET /api/companies/:companyId/jobs
 */
export const getCompanyJobs = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    // Validate query parameters
    const { error, value } = getJobsSchema.validate(req.query);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { page, limit, sort } = value;
    const skip = (page - 1) * limit;

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
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
  } catch (error) {
    next(new ApiError(500, error.message || "Error retrieving jobs"));
  }
};

/**
 * Get all jobs with filters
 * @route GET /api/jobs
 */
export const getAllJobs = async (req, res, next) => {
  try {
    // Validate query parameters
    const { error, value } = getJobsSchema.validate(req.query);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
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
  } catch (error) {
    next(new ApiError(500, error.message || "Error retrieving jobs"));
  }
};

/**
 * Get job applications
 * @route GET /api/jobs/:jobId/applications
 */
export const getJobApplications = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find job
    const job = await Job.findById(jobId);
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    // Get company
    const company = await Company.findById(job.companyId);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if user is authorized (company creator or HR)
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to view applications for this job")
      );
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
  } catch (error) {
    next(new ApiError(500, error.message || "Error retrieving applications"));
  }
};

/**
 * Apply to job
 * @route POST /api/jobs/:jobId/apply
 */
export const applyToJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Check if CV was uploaded
    if (!req.file) {
      return next(new ApiError(400, "CV is required"));
    }

    // Check if user role is "User"
    if (req.user.role !== "User") {
      return next(new ApiError(403, "Only users can apply to jobs"));
    }

    // Find job
    const job = await Job.findById(jobId);
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    // Check if job is active
    if (job.deletedAt || job.closed) {
      return next(
        new ApiError(400, "This job is no longer accepting applications")
      );
    }

    // Check if user already applied to this job
    const existingApplication = await Application.findOne({
      jobId,
      userId: req.user._id,
    });

    if (existingApplication) {
      return next(new ApiError(400, "You have already applied to this job"));
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

    // TODO: Emit socket event for notification to company HRs (Implemented with Socket.IO)

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
  } catch (error) {
    next(new ApiError(500, error.message || "Error submitting application"));
  }
};

/**
 * Update application status
 * @route PUT /api/applications/:id/status
 */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateApplicationStatusSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    // Find application
    const application = await Application.findById(id);
    if (!application) {
      return next(new ApiError(404, "Application not found"));
    }

    // Find job
    const job = await Job.findById(application.jobId);
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    // Get company
    const company = await Company.findById(job.companyId);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if user is authorized (company creator or HR)
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to update application status")
      );
    }

    // Update application status
    application.status = value.status;
    await application.save();

    // Get applicant details
    const applicant = await User.findById(application.userId);

    // Send email notification to applicant about status change
    if (applicant) {
      await sendApplicationStatusUpdate(applicant, job, company, value.status);
    }

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      application: {
        _id: application._id,
        jobId: application.jobId,
        status: application.status,
        updatedAt: application.updatedAt,
      },
    });
  } catch (error) {
    next(
      new ApiError(500, error.message || "Error updating application status")
    );
  }
};
