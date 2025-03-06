import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinaryV2 from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryV2,
  params: {
    folder: "job_search_app/users",
    allowed_formats: ["jpg", "png", "jpeg"],
    public_id: (req, file) => `${req.user.id}_${file.fieldname}_${Date.now()}`,
  },
});

const upload = multer({
  storage: storage,
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

export default upload;
