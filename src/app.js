import express from "express";
import morgan from "morgan";
import errorHandler from "./middleware/errorHandler.js";

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

app.use(errorHandler);

export default app;
