import Company from "../model/Company.model.js";
import Job from "../model/Job.model.js";
import Application from "../model/Application.model.js";
import { ApiError, NotFoundError } from "../utils/errors/customErrors.js";
import asyncHandler from "../utils/errors/asyncHandler.js";
import cloudinaryV2 from "../config/cloudinary.js";
import {
  createCompanySchema,
  updateCompanySchema,
  searchCompanySchema,
} from "../utils/validation/Company.validation.js";
import ExcelJS from "exceljs";
import User from "../model/User.model.js";

/**
 * Create a new company
 * @route POST /api/companies
 */
export const createCompany = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = createCompanySchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
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
    throw new ApiError(
      400,
      existingCompany.companyName === req.body.companyName
        ? "Company name already exists"
        : "Company email already exists"
    );
  }

  // Process HRs if provided
  let hrIds = [req.user._id]; // Add current user as HR by default
  
  if (req.body.HRs && Array.isArray(req.body.HRs) && req.body.HRs.length > 0) {
    // Find users by email
    const hrEmails = req.body.HRs.filter(email => email !== req.user.email); // Exclude current user's email
    
    if (hrEmails.length > 0) {
      const hrUsers = await User.find({ email: { $in: hrEmails } });
      
      if (hrUsers.length > 0) {
        // Add found users to HR list
        hrIds = [...hrIds, ...hrUsers.map(user => user._id)];
      }
    }
  }

  // Create new company
  const company = new Company({
    ...req.body,
    createdBy: req.user._id,
    HRs: hrIds, // Set HRs with processed IDs
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
      HRs: company.HRs,
      createdAt: company.createdAt,
    },
  });
});

/**
 * Update company details
 * @route PUT /api/companies/:id
 */
export const updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error } = updateCompanySchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is deleted
  if (company.deletedAt) {
    throw new ApiError(400, "Company has been deleted");
  }

  // Check if user is authorized (company creator or HR)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to update this company");
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
      throw new ApiError(
        400,
        existingCompany.companyName === req.body.companyName
          ? "Company name already exists"
          : "Company email already exists"
      );
    }
  }

  // Process HRs if provided (only company creator can update HRs)
  if (req.body.HRs && Array.isArray(req.body.HRs) && 
      (company.createdBy.toString() === req.user._id.toString() || req.user.role === "Admin")) {
    
    // Ensure company creator is always an HR
    const creatorEmail = (await User.findById(company.createdBy)).email;
    let hrEmails = req.body.HRs;
    
    if (!hrEmails.includes(creatorEmail)) {
      hrEmails.push(creatorEmail);
    }
    
    // Find users by email
    const hrUsers = await User.find({ email: { $in: hrEmails } });
    
    if (hrUsers.length > 0) {
      // Update company HRs
      company.HRs = hrUsers.map(user => user._id);
    } else {
      throw new ApiError(400, "No valid HR users found");
    }
    
    // Remove HRs from request body to prevent double processing
    delete req.body.HRs;
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
      HRs: company.HRs,
      updatedAt: company.updatedAt,
    },
  });
});

/**
 * Soft delete a company
 * @route DELETE /api/companies/:id
 */
export const deleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is already deleted
  if (company.deletedAt) {
    throw new ApiError(400, "Company already deleted");
  }

  // Check if user is authorized (company creator or admin)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to delete this company");
  }

  // Soft delete company
  company.deletedAt = new Date();
  await company.save();

  res.status(200).json({
    success: true,
    message: "Company deleted successfully",
  });
});

/**
 * Get company details with jobs
 * @route GET /api/companies/:id
 */
export const getCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is deleted
  if (company.deletedAt) {
    throw new NotFoundError("Company not found");
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
});

/**
 * Search companies
 * @route GET /api/companies/search
 */
export const searchCompanies = asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = searchCompanySchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
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
});

/**
 * Upload company logo
 * @route POST /api/companies/:id/logo
 */
export const uploadLogo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is deleted
  if (company.deletedAt) {
    throw new ApiError(400, "Company has been deleted");
  }

  // Check if user is authorized
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to update this company");
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
});

/**
 * Upload company cover picture
 * @route POST /api/companies/:id/cover
 */
export const uploadCoverPic = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is deleted
  if (company.deletedAt) {
    throw new ApiError(400, "Company has been deleted");
  }

  // Check if user is authorized
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to update this company");
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
});

/**
 * Delete company logo
 * @route DELETE /api/companies/:id/logo
 */
export const deleteLogo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is deleted
  if (company.deletedAt) {
    throw new ApiError(400, "Company has been deleted");
  }

  // Check if user is authorized
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to update this company");
  }

  // Check if logo exists
  if (!company.logo || !company.logo.public_id) {
    throw new ApiError(400, "Company does not have a logo");
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
});

/**
 * Delete company cover picture
 * @route DELETE /api/companies/:id/cover
 */
export const deleteCoverPic = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find company
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is deleted
  if (company.deletedAt) {
    throw new ApiError(400, "Company has been deleted");
  }

  // Check if user is authorized
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(403, "Not authorized to update this company");
  }

  // Check if cover picture exists
  if (!company.coverPic || !company.coverPic.public_id) {
    throw new ApiError(400, "Company does not have a cover picture");
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
});

/**
 * Export company applications for a specific day as Excel or All days
 * @route GET /api/companies/:companyId/applications/export
 */
export const exportCompanyApplications = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { date } = req.query;

  // Find company
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  // Check if company is deleted or banned
  if (company.deletedAt || company.bannedAt) {
    throw new ApiError(400, "Company is not active");
  }

  // Check if user is authorized (company creator, HR, or admin)
  const isAuthorized =
    company.createdBy.toString() === req.user._id.toString() ||
    company.HRs.some((hr) => hr.toString() === req.user._id.toString()) ||
    req.user.role === "Admin";

  if (!isAuthorized) {
    throw new ApiError(
      403,
      "Not authorized to access this company's applications"
    );
  }

  // Get all jobs for this company
  const companyJobs = await Job.find({ companyId });
  const jobIds = companyJobs.map((job) => job._id);

  // Create query for applications
  let applicationsQuery = { jobId: { $in: jobIds } };
  let fileNameDate = "all";

  // If date is provided, filter by that specific day
  if (date) {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new ApiError(400, "Invalid date format. Please use YYYY-MM-DD");
    }

    // Create date range for the specified day
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    applicationsQuery.createdAt = { $gte: startDate, $lt: endDate };
    fileNameDate = date;
  }

  // Find applications based on query
  const applications = await Application.find(applicationsQuery)
    .populate("userId", "firstName lastName email mobileNumber")
    .populate("jobId", "jobTitle seniorityLevel workingTime jobLocation");

  if (applications.length === 0) {
    throw new NotFoundError(
      date
        ? `No applications found for ${date}`
        : "No applications found for this company"
    );
  }

  // Create Excel workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheetTitle = date ? `Applications ${date}` : "All Applications";
  const worksheet = workbook.addWorksheet(worksheetTitle);

  // Define columns
  worksheet.columns = [
    { header: "Application ID", key: "id", width: 30 },
    { header: "Applicant Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Job Title", key: "jobTitle", width: 30 },
    { header: "Seniority Level", key: "seniorityLevel", width: 15 },
    { header: "Working Time", key: "workingTime", width: 15 },
    { header: "Job Location", key: "jobLocation", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Applied At", key: "appliedAt", width: 20 },
    { header: "CV Link", key: "cvLink", width: 50 },
  ];

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Add data to worksheet
  applications.forEach((application) => {
    worksheet.addRow({
      id: application._id.toString(),
      name: `${application.userId.firstName} ${application.userId.lastName}`,
      email: application.userId.email,
      phone: application.userId.mobileNumber || "N/A",
      jobTitle: application.jobId.jobTitle,
      seniorityLevel: application.jobId.seniorityLevel,
      workingTime: application.jobId.workingTime,
      jobLocation: application.jobId.jobLocation,
      status: application.status,
      appliedAt: application.createdAt.toLocaleString(),
      cvLink: application.userCV.secure_url,
    });
  });

  // Generate filename
  const fileName = `${company.companyName.replace(
    /\s+/g,
    "_"
  )}_applications_${fileNameDate}.xlsx`;

  // Set response headers for file download
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  // Write directly to the response
  await workbook.xlsx.write(res);
  res.end();
});
