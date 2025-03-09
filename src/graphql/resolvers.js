import User from "../model/User.model.js";
import Company from "../model/Company.model.js";
import Job from "../model/Job.model.js";
import Application from "../model/Application.model.js";
import { AuthorizationError } from "../utils/errors/customErrors.js";

const resolvers = {
  Query: {
    // User queries
    users: async (_, { page = 1, limit = 10, search = "" }, { user }) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      const skip = (page - 1) * limit;

      // Build search query
      const searchQuery = search
        ? {
            $or: [
              { firstName: { $regex: search, $options: "i" } },
              { lastName: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ],
          }
        : {};

      const users = await User.find(searchQuery)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const totalCount = await User.countDocuments(searchQuery);

      return {
        users,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    },

    user: async (_, { id }, { user }) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      return await User.findById(id);
    },

    // Company queries
    companies: async (
      _,
      { page = 1, limit = 10, search = "", approved },
      { user }
    ) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      const skip = (page - 1) * limit;

      // Build search query
      let searchQuery = search
        ? {
            $or: [
              { companyName: { $regex: search, $options: "i" } },
              { industry: { $regex: search, $options: "i" } },
              { companyEmail: { $regex: search, $options: "i" } },
            ],
          }
        : {};

      // Add approved filter if provided
      if (approved !== undefined) {
        searchQuery.approvedByAdmin = approved;
      }

      const companies = await Company.find(searchQuery)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("createdBy", "firstName lastName email")
        .populate("HRs", "firstName lastName email");

      const totalCount = await Company.countDocuments(searchQuery);

      return {
        companies,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    },

    company: async (_, { id }, { user }) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      return await Company.findById(id)
        .populate("createdBy", "firstName lastName email")
        .populate("HRs", "firstName lastName email");
    },

    // Job queries
    jobs: async (_, { page = 1, limit = 10, companyId }, { user }) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      const skip = (page - 1) * limit;

      // Build query
      const query = companyId ? { companyId } : {};

      const jobs = await Job.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("companyId", "companyName logo")
        .populate("addedBy", "firstName lastName email")
        .populate("updatedBy", "firstName lastName email");

      const totalCount = await Job.countDocuments(query);

      return {
        jobs,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    },

    job: async (_, { id }, { user }) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      return await Job.findById(id)
        .populate("companyId", "companyName logo")
        .populate("addedBy", "firstName lastName email")
        .populate("updatedBy", "firstName lastName email");
    },

    // Application queries
    applications: async (
      _,
      { page = 1, limit = 10, jobId, userId },
      { user }
    ) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      const skip = (page - 1) * limit;

      // Build query
      const query = {};
      if (jobId) query.jobId = jobId;
      if (userId) query.userId = userId;

      const applications = await Application.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate("jobId", "jobTitle companyId")
        .populate("userId", "firstName lastName email");

      const totalCount = await Application.countDocuments(query);

      return {
        applications,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    },

    application: async (_, { id }, { user }) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      return await Application.findById(id)
        .populate("jobId", "jobTitle companyId")
        .populate("userId", "firstName lastName email");
    },

    // Dashboard statistics
    statistics: async (_, __, { user }) => {
      // Check if user is admin
      if (user.role !== "Admin") {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      const totalUsers = await User.countDocuments();
      const totalCompanies = await Company.countDocuments();
      const totalJobs = await Job.countDocuments();
      const totalApplications = await Application.countDocuments();

      const pendingCompanies = await Company.countDocuments({
        approvedByAdmin: false,
        deletedAt: null,
        bannedAt: null,
      });
      const activeJobs = await Job.countDocuments({
        closed: false,
        deletedAt: null,
      });

      const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

      const recentCompanies = await Company.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("createdBy", "firstName lastName email");

      return {
        totalUsers,
        totalCompanies,
        totalJobs,
        totalApplications,
        pendingCompanies,
        activeJobs,
        recentUsers,
        recentCompanies,
      };
    },
  },

  // Resolve nested objects
  Company: {
    createdBy: async (company) => {
      if (company.createdBy._id) return company.createdBy;
      return await User.findById(company.createdBy);
    },
    HRs: async (company) => {
      if (company.HRs[0] && company.HRs[0]._id) return company.HRs;
      return await User.find({ _id: { $in: company.HRs } });
    },
  },

  Job: {
    companyId: async (job) => {
      if (job.companyId._id) return job.companyId;
      return await Company.findById(job.companyId);
    },
    addedBy: async (job) => {
      if (job.addedBy._id) return job.addedBy;
      return await User.findById(job.addedBy);
    },
    updatedBy: async (job) => {
      if (!job.updatedBy) return null;
      if (job.updatedBy._id) return job.updatedBy;
      return await User.findById(job.updatedBy);
    },
  },

  Application: {
    jobId: async (application) => {
      if (application.jobId._id) return application.jobId;
      return await Job.findById(application.jobId);
    },
    userId: async (application) => {
      if (application.userId._id) return application.userId;
      return await User.findById(application.userId);
    },
  },
};

export default resolvers;
