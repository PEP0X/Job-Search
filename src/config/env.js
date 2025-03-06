import Joi from "joi";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Define Validation for Environment Variables
const envSchema = Joi.object({
  PORT: Joi.number().default(3000).description("Port number for the server"),
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development")
    .description("Environment of the server"),
  MONGO_URI: Joi.string().required().description("MongoDB URI"),
  JWT_SECRET: Joi.string().required().description("JWT Secret Key"),
  JWT_EXPIRATION: Joi.string().required().description("JWT Expiration Time"),
  REFRESH_SECRET: Joi.string()
    .required()
    .description("Refresh Token Secret Key"),
  ENCRYPTION_KEY: Joi.string().required().description("Encryption Key"),
  IV_LENGTH: Joi.number().required().description("IV Length"),
  ENCRYPTION_IV: Joi.string().required().description("Encryption IV"),
  ALGORITHM: Joi.string().required().description("Algorithm"),
  EMAIL_USER: Joi.string().required().description("Email username"),
  EMAIL_PASS: Joi.string().required().description("Email password"),
  SITE_URL: Joi.string()
    .default("http://localhost:3000")
    .description("Frontend site URL"),
  API_URL: Joi.string().default("http://localhost:3000").description("API URL"),
  GOOGLE_CLIENT_ID: Joi.string()
    .required()
    .description("Google OAuth Client ID"),
  GOOGLE_CLIENT_SECRET: Joi.string()
    .required()
    .description("Google OAuth Client Secret"),
  CLOUDINARY_CLOUD_NAME: Joi.string()
    .required()
    .description("Cloudinary Cloud Name"),
  CLOUDINARY_API_KEY: Joi.string().required().description("Cloudinary API Key"),
  CLOUDINARY_API_SECRET: Joi.string()
    .required()
    .description("Cloudinary API Secret"),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  port: envVars.PORT,
  env: envVars.NODE_ENV,
  mongo: {
    uri: envVars.MONGO_URI,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiration: envVars.JWT_EXPIRATION,
  },
  encryption: {
    key: envVars.ENCRYPTION_KEY,
    ivLength: envVars.IV_LENGTH,
    algorithm: envVars.ALGORITHM,
    ENCRYPTION_IV: envVars.ENCRYPTION_IV,
  },
  email: {
    user: envVars.EMAIL_USER,
    password: envVars.EMAIL_PASS,
  },
  siteUrl: envVars.SITE_URL,
  apiUrl: envVars.API_URL,
  oauth: {
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
    },
  },
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },
};
