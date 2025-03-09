import { Router } from "express";
import {
  createCompany,
  updateCompany,
  deleteCompany,
  getCompany,
  searchCompanies,
  uploadLogo,
  uploadCoverPic,
  deleteLogo,
  deleteCoverPic,
  exportCompanyApplications,
} from "../controller/company.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Company CRUD routes
router.post("/", upload.document.single("legalAttachment"), createCompany);
router.put("/:id", updateCompany);
router.delete("/:id", deleteCompany);
router.get("/:id", getCompany);
router.get("/", searchCompanies);

// Company image management routes
router.post("/:id/logo", upload.image.single("logo"), uploadLogo);
router.post("/:id/cover", upload.image.single("coverPic"), uploadCoverPic);
router.delete("/:id/logo", deleteLogo);
router.delete("/:id/cover", deleteCoverPic);

// Bonus : collects the applications for a specific company on a specific day and creates an Excel sheet with this data
router.get("/:companyId/applications/export", exportCompanyApplications);

export default router;
