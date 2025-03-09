import app from "./app.js";
import mongoose from "mongoose";
import { config } from "./config/env.js";
import { startCronJobs } from "./utils/cron.js";
import { createServer } from "http";
import initializeSocketIO from "./config/socket.js";

mongoose
  .connect(config.mongo.uri)
  .then(() => {
    console.log("MongoDB Connected Successfully ✅");

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = initializeSocketIO(httpServer);

    // Make io available globally
    app.set("io", io);

    // Start server
    httpServer.listen(config.port, () => {
      console.log(`Server is Running on http://localhost:${config.port} 🚀`);
    });

    // Handle the SIGINT signal (e.g., when you press Ctrl+C)
    process.on("SIGINT", async () => {
      console.log("👋 Server is shutting down...");
      try {
        // Close MongoDB connection without callback
        await mongoose.connection.close();
        console.log("MongoDB Connection Closed ✅");
        httpServer.close(() => {
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
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  });
