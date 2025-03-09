import Company from "../model/Company.model.js";
import Application from "../model/Application.model.js";
import Job from "../model/Job.model.js";
import { ApiError } from "../utils/errors/customErrors.js";

/**
 * Middleware to verify if a user can initiate chat with HR/company owner
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const canInitiateHRChat = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Skip verification for admin users
    if (req.user.role === "Admin") {
      return next();
    }
    
    // Find companies where the target user is either owner or HR
    const companies = await Company.find({
      $or: [
        { createdBy: userId },
        { HRs: { $in: [userId] } }
      ]
    });
    
    if (companies.length === 0) {
      return next(new ApiError(403, "Cannot initiate chat with this user"));
    }
    
    // Check if the user has applied to any job from these companies
    const hasApplied = await Application.exists({
      userId: req.user._id,
      jobId: { 
        $in: await Job.find({ 
          companyId: { $in: companies.map(c => c._id) } 
        }).distinct('_id')
      }
    });
    
    if (!hasApplied) {
      return next(new ApiError(403, "You can only chat with HR after applying to a job"));
    }
    
    next();
  } catch (error) {
    next(new ApiError(500, error.message || "Error verifying chat permissions"));
  }
};