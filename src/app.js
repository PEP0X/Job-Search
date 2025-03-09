import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import companyRoutes from "./routes/company.routes.js";
import jobRoutes from "./routes/job.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import chatRoutes from "./routes/chat.routes.js"; // Add this line
import passport from "./config/passport.js";
import { tokenErrorHandler } from "./middleware/refreshToken.middleware.js";
import createApolloServer from "./graphql/server.js";
import { verifyToken } from "./middleware/auth.middleware.js";

const app = express();

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiter to all requests
app.use(limiter);

// Apply Helmet for security headers
app.use(helmet());

// Configure CORS with specific origins
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middleware
app.use(morgan("dev"));
app.use(express.json());

// Initialize passport
app.use(passport.initialize());

// Routes
app.get("/api", (req, res) => {
  res.json({
    message: "Welcome to Job-Search API 🚀",
  });
});

// Main Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chats", chatRoutes); // Add this line

// Temporary route to handle social login callback
app.get("/auth/social-callback", (req, res) => {
  const { accessToken, refreshToken } = req.query;

  // For testing purposes, display the tokens
  res.send(`
    <h1>Authentication Successful!</h1>
    <p>Access Token: ${accessToken}</p>
    <p>Refresh Token: ${refreshToken}</p>
    <p>You can now use these tokens to make authenticated API requests.</p>
  `);
});

// Apply authentication middleware to GraphQL endpoint
app.use("/api/graphql", verifyToken);

// Initialize Apollo Server
createApolloServer(app).catch((err) => {
  console.error("Failed to start Apollo Server:", err);
});

app.use(tokenErrorHandler);
app.use(errorHandler);

export default app;
