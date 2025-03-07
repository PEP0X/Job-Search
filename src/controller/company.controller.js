import Company from "../model/Company.model.js";
import Job from "../model/Job.model.js";
import { ApiError } from "../utils/errors/customErrors.js";
import cloudinaryV2 from "../config/cloudinary.js";
import {
  createCompanySchema,
  updateCompanySchema,
  searchCompanySchema,
} from "../utils/validation/Company.validation.js";

/**
 * Create a new company
 * @route POST /api/companies
 */
export const createCompany = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = createCompanySchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    // Check if company with same name or email already exists
    const existingCompany = await Company.findOne({
      $or: [
        { companyName: req.body.companyName },
        { companyEmail: req.body.companyEmail },
      ],
      deletedAt: null,
    });

    if (existingCompany) {
      return next(
        new ApiError(
          400,
          existingCompany.companyName === req.body.companyName
            ? "Company name already exists"
            : "Company email already exists"
        )
      );
    }

    // Create new company
    const company = new Company({
      ...req.body,
      createdBy: req.user._id,
      HRs: [req.user._id], // Add current user as HR
    });

    // If legal attachment was uploaded
    if (req.file) {
      company.legalAttachment = {
        secure_url: req.file.path,
        public_id: req.file.filename,
      };
    }

    await company.save();

    res.status(201).json({
      success: true,
      message: "Company created successfully",
      company: {
        _id: company._id,
        companyName: company.companyName,
        description: company.description,
        industry: company.industry,
        address: company.address,
        numberOfEmployees: company.numberOfEmployees,
        companyEmail: company.companyEmail,
        createdBy: company.createdBy,
        approvedByAdmin: company.approvedByAdmin,
        createdAt: company.createdAt,
      },
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error creating company"));
  }
};

/**
 * Update company details
 * @route PUT /api/companies/:id
 */
export const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error } = updateCompanySchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    // Find company
    const company = await Company.findById(id);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if company is deleted
    if (company.deletedAt) {
      return next(new ApiError(400, "Company has been deleted"));
    }

    // Check if user is authorized (company creator or HR)
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to update this company")
      );
    }

    // Check if updating to an existing company name or email
    if (req.body.companyName || req.body.companyEmail) {
      const existingCompany = await Company.findOne({
        _id: { $ne: id },
        $or: [
          req.body.companyName ? { companyName: req.body.companyName } : {},
          req.body.companyEmail ? { companyEmail: req.body.companyEmail } : {},
        ],
        deletedAt: null,
      });

      if (existingCompany) {
        return next(
          new ApiError(
            400,
            existingCompany.companyName === req.body.companyName
              ? "Company name already exists"
              : "Company email already exists"
          )
        );
      }
    }

    // Update company
    Object.keys(req.body).forEach((key) => {
      if (updateCompanySchema.describe().keys[key]) {
        company[key] = req.body[key];
      }
    });

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company updated successfully",
      company: {
        _id: company._id,
        companyName: company.companyName,
        description: company.description,
        industry: company.industry,
        address: company.address,
        numberOfEmployees: company.numberOfEmployees,
        companyEmail: company.companyEmail,
        logo: company.logo,
        coverPic: company.coverPic,
        updatedAt: company.updatedAt,
      },
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error updating company"));
  }
};

/**
 * Soft delete a company
 * @route DELETE /api/companies/:id
 */
export const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find company
    const company = await Company.findById(id);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if company is already deleted
    if (company.deletedAt) {
      return next(new ApiError(400, "Company already deleted"));
    }

    // Check if user is authorized (company creator or admin)
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to delete this company")
      );
    }

    // Soft delete company
    company.deletedAt = new Date();
    await company.save();

    res.status(200).json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error deleting company"));
  }
};

/**
 * Get company details with jobs
 * @route GET /api/companies/:id
 */
export const getCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find company
    const company = await Company.findById(id);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if company is deleted
    if (company.deletedAt) {
      return next(new ApiError(404, "Company not found"));
    }

    // Find active jobs for this company with pagination
    const jobs = await Job.find({
      companyId: id,
      deletedAt: null,
      closed: false,
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total jobs count for pagination
    const totalJobs = await Job.countDocuments({
      companyId: id,
      deletedAt: null,
      closed: false,
    });

    res.status(200).json({
      success: true,
      company: {
        _id: company._id,
        companyName: company.companyName,
        description: company.description,
        industry: company.industry,
        address: company.address,
        numberOfEmployees: company.numberOfEmployees,
        companyEmail: company.companyEmail,
        logo: company.logo,
        coverPic: company.coverPic,
        createdAt: company.createdAt,
      },
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
    next(new ApiError(500, error.message || "Error retrieving company"));
  }
};

/**
 * Search companies
 * @route GET /api/companies/search
 */
export const searchCompanies = async (req, res, next) => {
  try {
    // Validate query parameters
    const { error, value } = searchCompanySchema.validate(req.query);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { name, page, limit } = value;
    const skip = (page - 1) * limit;

    // Build search query
    const query = { deletedAt: null };
    if (name) {
      query.companyName = { $regex: name, $options: "i" };
    }

    // Find companies matching the search criteria
    const companies = await Company.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select("-HRs -legalAttachment");

    // Get total count for pagination
    const totalCompanies = await Company.countDocuments(query);

    res.status(200).json({
      success: true,
      companies: {
        data: companies,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCompanies / limit),
          totalItems: totalCompanies,
          limit,
        },
      },
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error searching companies"));
  }
};

/**
 * Upload company logo
 * @route POST /api/companies/:id/logo
 */
export const uploadLogo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return next(new ApiError(400, "No file uploaded"));
    }

    // Find company
    const company = await Company.findById(id);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if company is deleted
    if (company.deletedAt) {
      return next(new ApiError(400, "Company has been deleted"));
    }

    // Check if user is authorized
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to update this company")
      );
    }

    // Delete old logo if exists
    if (company.logo && company.logo.public_id) {
      await cloudinaryV2.uploader.destroy(company.logo.public_id);
    }

    // Update company with new logo
    company.logo = {
      secure_url: req.file.path,
      public_id: req.file.filename,
    };

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company logo uploaded successfully",
      logo: company.logo,
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error uploading logo"));
  }
};

/**
 * Upload company cover picture
 * @route POST /api/companies/:id/cover
 */
export const uploadCoverPic = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return next(new ApiError(400, "No file uploaded"));
    }

    // Find company
    const company = await Company.findById(id);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    }

    // Check if company is deleted
    if (company.deletedAt) {
      return next(new ApiError(400, "Company has been deleted"));
    }

    // Check if user is authorized
    const isAuthorized =
      company.createdBy.toString() === req.user._id.toString() ||
      company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
      req.user.role === "Admin";

    if (!isAuthorized) {
      return next(
        new ApiError(403, "Not authorized to update this company")
      );
    }

    // Delete old cover picture if exists
    if (company.coverPic && company.coverPic.public_id) {
      await cloudinaryV2.uploader.destroy(company.coverPic.public_id);
    }

    // Update company with new cover picture
    company.coverPic = {
      secure_url: req.file.path,
      public_id: req.file.filename,
    };

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company cover picture uploaded successfully",
      coverPic: company.coverPic,
    });
  } catch (error) {
    next(new ApiError(500, error.message || "Error uploading cover picture"));
  }
};

/**
 * Delete company logo
 * @route DELETE /api/companies/:id/logo
 */
export const deleteLogo = async (req, res, next) => {
    try {
      const { id } = req.params;
  
      // Find company
      const company = await Company.findById(id);
      if (!company) {
        return next(new ApiError(404, "Company not found"));
      }
  
      // Check if company is deleted
      if (company.deletedAt) {
        return next(new ApiError(400, "Company has been deleted"));
      }
  
      // Check if user is authorized
      const isAuthorized =
        company.createdBy.toString() === req.user._id.toString() ||
        company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
        req.user.role === "Admin";
  
      if (!isAuthorized) {
        return next(
          new ApiError(403, "Not authorized to update this company")
        );
      }
  
      // Check if logo exists
      if (!company.logo || !company.logo.public_id) {
        return next(new ApiError(400, "Company does not have a logo"));
      }
  
      // Delete logo from cloudinary
      await cloudinaryV2.uploader.destroy(company.logo.public_id);
  
      // Remove logo from company
      company.logo = undefined;
      await company.save();
  
      res.status(200).json({
        success: true,
        message: "Company logo deleted successfully",
      });
    } catch (error) {
      next(new ApiError(500, error.message || "Error deleting logo"));
    }
  };
  
  /**
   * Delete company cover picture
   * @route DELETE /api/companies/:id/cover
   */
  export const deleteCoverPic = async (req, res, next) => {
    try {
      const { id } = req.params;
  
      // Find company
      const company = await Company.findById(id);
      if (!company) {
        return next(new ApiError(404, "Company not found"));
      }
  
      // Check if company is deleted
      if (company.deletedAt) {
        return next(new ApiError(400, "Company has been deleted"));
      }
  
      // Check if user is authorized
      const isAuthorized =
        company.createdBy.toString() === req.user._id.toString() ||
        company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
        req.user.role === "Admin";
  
      if (!isAuthorized) {
        return next(
          new ApiError(403, "Not authorized to update this company")
        );
      }
  
      // Check if cover picture exists
      if (!company.coverPic || !company.coverPic.public_id) {
        return next(new ApiError(400, "Company does not have a cover picture"));
      }
  
      // Delete cover picture from cloudinary
      await cloudinaryV2.uploader.destroy(company.coverPic.public_id);
  
      // Remove cover picture from company
      company.coverPic = undefined;
      await company.save();
  
      res.status(200).json({
        success: true,
        message: "Company cover picture deleted successfully",
      });
    } catch (error) {
      next(new ApiError(500, error.message || "Error deleting cover picture"));
    }
  };