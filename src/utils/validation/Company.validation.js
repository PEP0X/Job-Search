import Joi from "joi";

export const createCompanySchema = Joi.object({
  companyName: Joi.string().required().min(2).max(100),
  description: Joi.string().required().min(10),
  industry: Joi.string().required(),
  address: Joi.string().required(),
  numberOfEmployees: Joi.string()
    .required()
    .pattern(/^(\d+-\d+|\d+\+)$/), // Matches "10-50" or "10+"
  companyEmail: Joi.string().email().required(),
  HRs: Joi.array().items(Joi.string().email()),
});

export const updateCompanySchema = Joi.object({
  companyName: Joi.string().min(2).max(100),
  description: Joi.string().min(10),
  industry: Joi.string(),
  address: Joi.string(),
  numberOfEmployees: Joi.string().pattern(/^(\d+-\d+|\d+\+)$/),
  companyEmail: Joi.string().email(),
});

export const searchCompanySchema = Joi.object({
  name: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});
