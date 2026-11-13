import { ZodError } from "zod";

export const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let errors = undefined;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";

    errors = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }

  // Handle duplicate MongoDB records
  if (error.code === 11000) {
    statusCode = 409;
    message = "A record with this information already exists";
  }

  // Handle Mongoose validation errors
  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Database validation failed";
  }

  // Never expose internal error details in production
  if (statusCode >= 500 && process.env.NODE_ENV === "production") {
    message = "Internal server error";
  }

  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json(response);
};