import { v2 as cloudinaryV2 } from "cloudinary";
import { config } from "./env.js";

cloudinaryV2.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinaryV2;
