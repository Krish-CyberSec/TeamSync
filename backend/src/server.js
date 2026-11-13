import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./database/connection.js";
import mongoose from "mongoose";
const startServer = async () => {
  let server;

  try {
    await connectDB();

    server = app.listen(env.PORT, () => {
      console.log(`TeamSync server running on port ${env.PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down TeamSync...`);

      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log("MongoDB connection closed.");
          process.exit(0);
        } catch (error) {
          console.error("Shutdown error:", error.message);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("Failed to start TeamSync:", error.message);
    process.exit(1);
  }
};

startServer();