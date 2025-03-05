import { Schema, model } from "mongoose";
import Joi from "joi";

const EmailValidation = (value) => {
  const schema = Joi.string().email().required();
  const { error } = schema.validate(value);
  return !error;
};

const CompanySchema = new Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Company description is required"],
    },
    industry: {
      type: String,
      required: [true, "Industry is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    numberOfEmployees: {
      type: String,
      required: [true, "Number of employees is required"],
      validate: {
        validator: function (value) {
          // Validate format to be like this -> ("1-10", "11-50", "51-200", "201-500", "501+")
          return /^(\d+-\d+|\d+\+)$/.test(value);
        },
        message: (props) => `${props.value} is not a valid employee range!`,
      },
    },
    companyEmail: {
      type: String,
      required: [true, "Company email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: EmailValidation,
        message: "Please provide a valid email address",
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    logo: {
      secure_url: String,
      public_id: String,
    },
    coverPic: {
      secure_url: String,
      public_id: String,
    },
    HRs: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    bannedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    legalAttachment: {
      secure_url: String,
      public_id: String,
    },
    approvedByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for related jobs
CompanySchema.virtual("jobs", {
  ref: "Job",
  localField: "_id",
  foreignField: "company",
});

// Add a method to check if company is active (not banned or deleted)
CompanySchema.methods.isActive = function () {
  return !this.bannedAt && !this.deletedAt;
};

// Add a static method to find active companies
CompanySchema.statics.findActive = function () {
  return this.find({
    bannedAt: null,
    deletedAt: null,
    approvedByAdmin: true,
  });
};

const Company = model("Company", CompanySchema);

export default Company;
