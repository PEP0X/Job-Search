import express from "express";
import morgan from "morgan";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

// Middleware
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.get("/api", (req, res) => {
  res.json({
    message: "Welcome to Job-Search API 🚀",
  });
});

// Main Routes
app.use("/api/auth", authRoutes);

app.use(errorHandler);

export default app;
