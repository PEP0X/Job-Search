import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinaryV2 from "../config/cloudinary.js";

// Create separate storage configurations for different file types
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinaryV2,
  params: {
    folder: "job_search_app/images",
    allowed_formats: ["jpg", "png", "jpeg"],
    public_id: (req, file) => `${req.user.id}_${file.fieldname}_${Date.now()}`,
  },
});

const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinaryV2,
  params: {
    folder: "job_search_app/documents",
    allowed_formats: ["pdf"],
    public_id: (req, file) => `${req.user.id}_${file.fieldname}_${Date.now()}`,
  },
});

// Image upload configuration (for profile pics, logos, cover images)
const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpg|jpeg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      file.originalname.split(".").pop().toLowerCase()
    );
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only .jpg, .jpeg and .png files are allowed!"));
  },
});

// Document upload configuration (for legal attachments, CVs, etc.)
const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB for documents
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      file.originalname.split(".").pop().toLowerCase()
    );
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only PDF files are allowed!"));
  },
});

// Export both configurations
export default {
  image: imageUpload,
  document: documentUpload
};
