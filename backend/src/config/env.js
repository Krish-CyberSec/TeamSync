
import "dotenv/config";
import { z } from "zod";  // for schema validation

const envSchema = z.object({
  NODE_ENV: z // for environment variable validation
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000), // for port validation

  MONGO_URI: z.string().optional(), // for MongoDB connection string validation

  JWT_ACCESS_SECRET: z.string().min(32), // for JWT access token secret validation
  JWT_REFRESH_SECRET: z.string().min(32), // for JWT refresh token secret validation

  CLIENT_URL: z.string().url().default("http://localhost:5173"), // for client URL validation

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"]) // for log level validation
    .default("info"),
});

const parsedEnv = envSchema.safeParse(process.env); // validate the environment variables against the schema safeParse method returns an object with success and data properties. If the validation fails, success will be false and data will contain the error details. If the validation succeeds, success will be true and data will contain the validated environment variables.

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = Object.freeze(parsedEnv.data); // freeze the validated environment variables to prevent accidental modifications
