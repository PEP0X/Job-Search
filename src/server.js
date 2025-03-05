import app from "./app.js";
import mongoose from "mongoose";
import { config } from "./config/env.js";
import { startCronJobs } from "./utils/cron.js";

mongoose
  .connect(config.mongo.uri)
  .then(() => {
    console.log("MongoDB Connected Successfully ✅");
    const server = app.listen(config.port, () => {
      console.log(`Server is Running on http://localhost:${config.port} 🚀`);
    });

    // Handle the SIGINT signal (e.g., when you press Ctrl+C)
    process.on("SIGINT", async () => {
      console.log("👋 Server is shutting down...");
      try {
        // Close MongoDB connection without callback
        await mongoose.connection.close();
        console.log("MongoDB Connection Closed ✅");
        server.close(() => {
          console.log("HTTP server closed");
          process.exit(0);
        });
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });

    // Start cron jobs after server is running
    startCronJobs();
  })
  .catch((error) => {
    console.error(`MongoDB Connection Error: ${error.message} ❌`);
    console.error("Server is not running ❌");
  });
