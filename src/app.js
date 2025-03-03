import express from "express";
import morgan from "morgan";

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

export default app;
