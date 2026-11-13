import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import healthRouter from "./modules/health/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
const app = express();

// CORS middleware to allow requests from the client URL specified in the environment variables
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
// Security middleware for clickjacking, XSS, and other attacks. It sets various HTTP headers to secure the app.
app.use(helmet());

// middleware to parse incoming JSON requests to JavaScript objects
app.use(express.json());

// Health check endpoint
app.use("/api/v1/health", healthRouter);

// Importing the authentication routes
app.use("/api/v1/auth", authRoutes);

export default app;