import Joi from "joi";

export const createJobSchema = Joi.object({
  jobTitle: Joi.string().required().trim(),
  jobLocation: Joi.string().required().valid("onsite", "remotely", "hybrid"),
  workingTime: Joi.string().required().valid("part-time", "full-time"),
  seniorityLevel: Joi.string()
    .required()
    .valid("fresh", "Junior", "Mid-Level", "Senior", "Team-Lead", "CTO"),
  jobDescription: Joi.string().required(),
  technicalSkills: Joi.array().items(Joi.string()).min(1).required(),
  softSkills: Joi.array().items(Joi.string()).min(1).required(),
  companyId: Joi.string().required(),
});

export const updateJobSchema = Joi.object({
  jobTitle: Joi.string().trim(),
  jobLocation: Joi.string().valid("onsite", "remotely", "hybrid"),
  workingTime: Joi.string().valid("part-time", "full-time"),
  seniorityLevel: Joi.string().valid(
    "fresh",
    "Junior",
    "Mid-Level",
    "Senior",
    "Team-Lead",
    "CTO"
  ),
  jobDescription: Joi.string(),
  technicalSkills: Joi.array().items(Joi.string()).min(1),
  softSkills: Joi.array().items(Joi.string()).min(1),
  closed: Joi.boolean(),
});

export const getJobsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sort: Joi.string().default("-createdAt"),
  workingTime: Joi.string().valid("part-time", "full-time"),
  jobLocation: Joi.string().valid("onsite", "remotely", "hybrid"),
  seniorityLevel: Joi.string().valid(
    "fresh",
    "Junior",
    "Mid-Level",
    "Senior",
    "Team-Lead",
    "CTO"
  ),
  jobTitle: Joi.string(),
  technicalSkills: Joi.string(), // Comma-separated list of skills
  companyId: Joi.string(),
});

export const updateApplicationStatusSchema = Joi.object({
  status: Joi.string()
    .required()
    .valid("pending", "accepted", "viewed", "in consideration", "rejected"),
});