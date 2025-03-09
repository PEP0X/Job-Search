import mongoose from 'mongoose';
import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../config/env.js";
import crypto from "crypto";

const userProviders = ["system", "google"];
const userGender = ["Male", "Female"];
const userRole = ["Admin", "User"];

const dobValidator = (value) => {
  const now = new Date();
  const DOB = new Date(value);
  let age = now.getFullYear() - DOB.getFullYear();
  const monthDiff = now.getMonth() - DOB.getMonth();

  // Check if the birthday has already occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < DOB.getDate())) {
    age--;
  }
  return age >= 18;
};

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is Required"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is Required"],
    },
    email: {
      type: String,
      required: [true, "Email is Required"],
      unique: true,
      match: [/\S+@\S+\.\S+/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is Required"],
    },
    provider: {
      type: String,
      enum: userProviders,
      default: "system",
    },
    gender: {
      type: String,
      required: [true, "Gender is Required"],
      enum: userGender,
    },
    DOB: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: dobValidator,
        message: "User must be at least 18 years old",
      },
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
    },
    role: {
      type: String,
      enum: userRole,
      default: "User",
    },
    isConfirmed: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    changeCredentialTime: {
      type: Date,
      default: Date.now,
    },
    profilePic: {
      secure_url: String,
      public_id: String,
    },
    coverPic: {
      secure_url: String,
      public_id: String,
    },
    OTP: [
      {
        code: String,
        type: {
          type: String,
          enum: ["confirmEmail", "forgetPassword"],
        },
        expiresIn: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

//! Virtual Field for username (User Collection Task)
UserSchema.virtual("username").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ! Pre-save hook for password hashing and mobile number encryption
UserSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (this.isModified("password")) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (error) {
      return next(error);
    }
  }

  // Encrypt mobile number if it has been modified
  if (this.isModified("mobileNumber")) {
    try {
      this.mobileNumber = this.encryptMobileNumber(this.mobileNumber);
    } catch (error) {
      return next(error);
    }
  }

  next();
});

// ! Method to Compare Password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ! Method to encrypt mobile number
UserSchema.methods.encryptMobileNumber = function (text) {
  const iv = crypto.randomBytes(config.encryption.ivLength);
  const cipher = crypto.createCipheriv(
    config.encryption.algorithm,
    Buffer.from(config.encryption.key),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

// ! Method to decrypt mobile number
UserSchema.methods.decryptMobileNumber = function () {
  try {
    const textParts = this.mobileNumber.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      config.encryption.algorithm,
      Buffer.from(config.encryption.key),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Error decrypting mobile number:", error);
    return null;
  }
};

// Pre-hook for findOneAndDelete and deleteOne operations [Must Implemented]
UserSchema.pre(['findOneAndDelete', 'deleteOne'], { document: false, query: true }, async function() {
  const user = await this.model.findOne(this.getFilter());
  if (!user) return;
  
  const userId = user._id;
  
  // Update companies where user is creator or HR
  await mongoose.model('Company').updateMany(
    { createdBy: userId },
    { $set: { createdBy: null } }
  );
  
  await mongoose.model('Company').updateMany(
    { HRs: userId },
    { $pull: { HRs: userId } }
  );
  
  // Update jobs added by user
  await mongoose.model('Job').updateMany(
    { addedBy: userId },
    { $set: { addedBy: null } }
  );
  
  // Delete user's applications
  await mongoose.model('Application').deleteMany({ userId });
});

// Pre-hook for document middleware (when using save() for soft delete)
UserSchema.pre('save', async function(next) {
  // If this is a soft delete operation
  if (this.isModified('deletedAt') && this.deletedAt) {
    try {
      // Mark user's applications as deleted or rejected
      await mongoose.model('Application').updateMany(
        { userId: this._id },
        { $set: { status: 'rejected' } }
      );
    } catch (error) {
      console.error('Error in User soft delete hook:', error);
    }
  }
  next();
});


const User = model("User", UserSchema);

export default User;
