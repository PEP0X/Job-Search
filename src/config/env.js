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
  ENCRYPTION_KEY: Joi.string().required().description("Encryption Key"),
  IV_LENGTH: Joi.number().required().description("IV Length"),
  ALGORITHM: Joi.string().required().description("Algorithm"),
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
  },
};
