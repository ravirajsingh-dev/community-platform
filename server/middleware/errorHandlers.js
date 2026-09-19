/**
 * Error Handlers Middleware Module
 * 
 * Centralized error handling middleware for the Express application.
 * Handles different types of errors and sanitizes error messages before
 * sending responses to clients to prevent information leakage.
 * 
 * Error handlers (order matters):
 * 1. Body size error handler - handles request body size limit exceeded
 * 2. Validation error handler - handles Mongoose validation errors
 * 3. Generic error handler - handles all other unhandled errors
 */

const {
  sanitizeError,
  sanitizeValidationErrors,
} = require("../utils/errorSanitizer");

/**
 * Error handler for request body size limit exceeded
 * Must be registered first to catch body parser errors
 */
const bodySizeErrorHandler = (err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request entity too large",
      message:
        "Request body size exceeds the 10MB limit. Please reduce the payload size.",
    });
  }
  next(err);
};

/**
 * Validation error handler
 * Handles Mongoose validation errors and sanitizes error messages
 */
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    // Validation error occurred - sanitize messages
    const errors = Object.values(err.errors).map((error) => ({
      path: error.path,
      msg: sanitizeError(error.message, "validation"),
    }));
    return res
      .status(400)
      .json({ error: "Validation error", messages: errors.map((e) => e.msg) });
  }
  next(err);
};

/**
 * Generic error handler
 * Handles all unhandled errors and sanitizes error messages
 */
const errorHandler = (err, req, res, next) => {
  console.error("Unhandled error:", err);
  const sanitizedMessage = sanitizeError(err, "generic");
  res.status(500).json({ error: sanitizedMessage });
};

module.exports = {
  bodySizeErrorHandler,
  validationErrorHandler,
  errorHandler,
};
