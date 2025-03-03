import app from "./app.js";
import mongoose from "mongoose";
import { config } from "./config/env.js";

mongoose
  .connect(config.mongo.uri)
  .then(() => {
    console.log("MongoDB Connected Successfully ✅");
    app.listen(config.port, () => {
      console.log(`Server is Running on http://localhost:${config.port} 🚀`);
    });
  })
  .catch((error) => {
    console.error(`MongoDB Connection Error: ${error.message} ❌`);
    console.error("Server is not running ❌");
  });
