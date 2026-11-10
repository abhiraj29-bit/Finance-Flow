import { ZodError } from "zod";

export function errorHandler(err, _req, res, _next) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({
      message: "Validation error",
      errors: formattedErrors,
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      message: `Invalid format for field "${err.path}"`,
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      message: `A record with this ${field} already exists`,
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}
