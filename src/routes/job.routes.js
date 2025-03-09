import { Router } from "express";
import {
  createJob,
  updateJob,
  deleteJob,
  getCompanyJobs,
  getAllJobs,
  getJobApplications,
  applyToJob,
  updateApplicationStatus,
} from "../controller/job.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Job CRUD routes
router.post("/", createJob);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);
router.get("/", getAllJobs);

// Company specific job routes
router.get("/company/:companyId", getCompanyJobs);

// Job application routes
router.get("/:jobId/applications", getJobApplications);
router.post("/:jobId/apply", upload.document.single("cv"), applyToJob);
router.put("/applications/:id/status", updateApplicationStatus);

export default router;
