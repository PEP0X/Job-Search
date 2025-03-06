import {
  updateSchema,
  passwordSchema,
} from "../utils/validation/User.validation.js";
import User from "../model/User.model.js";
import cloudinaryV2 from "../config/cloudinary.js";


// Update User
export const updateUser = async (req, res) => {
  try {
    const { error } = updateSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updates = {};
    for (const key in req.body) {
      if (updateSchema.describe().keys[key]) updates[key] = req.body[key];
    }

    updates.updatedBy = req.user.id;
    Object.assign(user, updates);
    await user.save();

    res.json({ 
        message: "User updated successfully", 
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          gender: user.gender,
          DOB: user.DOB,
          mobileNumber: user.mobileNumber,
          role: user.role,
          profilePic: user.profilePic,
          coverPic: user.coverPic,
          updatedAt: user.updatedAt
        } 
      });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user is deleted
    if (user.deletedAt)
      return res.status(403).json({ message: "Account has been deleted" });

    // Decrypt mobile number if it exists
    let decryptedMobileNumber = null;
    if (user.mobileNumber) {
      try {
        decryptedMobileNumber = user.decryptMobileNumber();
      } catch (error) {
        console.error("Error decrypting mobile number:", error);
      }
    }

    res.json({
      success: true,
      user: {
        _id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        DOB: user.DOB,
        mobileNumber: decryptedMobileNumber || user.mobileNumber,
        role: user.role,
        isConfirmed: user.isConfirmed,
        profilePic: user.profilePic,
        coverPic: user.coverPic,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Other user Profile
export const getOtherUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if userId is a valid ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    const user = await User.findById(userId);

    if (!user)
      return res.status(404).json({ message: "User not found or inactive" });

    // Check if user is deleted
    if (user.deletedAt) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return only public fields
    res.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePic: user.profilePic,
        coverPic: user.coverPic,
      },
    });
  } catch (error) {
    // Handle specific MongoDB ObjectId casting errors
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Update Password
export const updatePassword = async (req, res) => {
  try {
    const { error } = passwordSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
      return res.status(400).json({ message: "Current password is incorrect" });

    // Update password
    user.password = newPassword;
    user.changeCredentialTime = new Date();
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upload Profile Picture
export const uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete old profile picture from Cloudinary if exists
    if (user.profilePic && user.profilePic.public_id) {
      await cloudinaryV2.uploader.destroy(user.profilePic.public_id);
    }

    // Update user with new profile picture
    user.profilePic = {
      secure_url: req.file.path,
      public_id: req.file.filename,
    };

    await user.save();

    res.json({
      success: true,
      message: "Profile picture uploaded successfully",
      profilePic: user.profilePic,
    });
  } catch (err) {
    console.error("Profile picture upload error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Upload Cover Picture
export const uploadCoverPic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete old cover picture from Cloudinary if exists
    if (user.coverPic && user.coverPic.public_id) {
      await cloudinaryV2.uploader.destroy(user.coverPic.public_id);
    }

    // Update user with new cover picture
    user.coverPic = {
      secure_url: req.file.path,
      public_id: req.file.filename,
    };

    await user.save();

    res.json({
      message: "Cover picture uploaded successfully",
      coverPic: user.coverPic,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Profile Picture
export const deleteProfilePic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete profile picture from Cloudinary if exists
    if (user.profilePic && user.profilePic.public_id) {
      await cloudinaryV2.uploader.destroy(user.profilePic.public_id);
    }

    // Remove profile picture from user
    user.profilePic = undefined;
    await user.save();

    res.json({ message: "Profile picture deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Cover Picture
export const deleteCoverPic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete cover picture from Cloudinary if exists
    if (user.coverPic && user.coverPic.public_id) {
      await cloudinaryV2.uploader.destroy(user.coverPic.public_id);
    }

    // Remove cover picture from user
    user.coverPic = undefined;
    await user.save();

    res.json({ message: "Cover picture deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Soft Delete Account
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Set deletedAt to current date
    user.deletedAt = new Date();
    await user.save();

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
