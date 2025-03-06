import Joi from "joi";

export const updateSchema = Joi.object({
  mobileNumber: Joi.string().pattern(/^[0-9]{10,15}$/),
  DOB: Joi.date(),
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  gender: Joi.string().valid("Male", "Female"),
});

export const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});
