import express from "express";
import morgan from "morgan";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import passport from "./config/passport.js";
import { tokenErrorHandler } from "./middleware/refreshToken.middleware.js";
const app = express();

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

app.use(tokenErrorHandler);
app.use(errorHandler);

export default app;
