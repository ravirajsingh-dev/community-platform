/**
 * Rate Limiter Configuration Module
 *
 * Defines rate limiting configurations for different route groups to prevent
 * abuse and brute force attacks. Each route group has appropriate limits based
 * on its security requirements.
 *
 * Rate limiters:
 * - Auth routes: 15 requests per 15 minutes (prevents brute force)
 * - Admin routes: 50 requests per 15 minutes (moderate restriction)
 * - General API routes: 100 requests per 15 minutes (standard usage)
 */

const rateLimit = require("express-rate-limit");

/**
 * Authentication rate limiter
 * Prevents brute force attacks on login endpoints
 * Limit: 15 requests per 15 minutes
 */
const createAuthLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // Limit each IP to 15 requests per windowMs
    message: "Too many authentication attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Admin routes rate limiter
 * Moderate restriction for admin operations
 * Limit: 50 requests per 15 minutes
 */
const createAdminLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * General API routes rate limiter
 * Standard restriction for regular API usage
 * Limit: 100 requests per 15 minutes
 */
const createGeneralApiLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Conditional auth rate limiter middleware
 * Excludes registration route from rate limiting
 * @param {Function} authLimiter - The auth rate limiter instance
 * @returns {Function} Middleware function
 */
const createAuthRateLimitMiddleware = (authLimiter) => {
  return (req, res, next) => {
    // Skip rate limiting for registration route
    // Check both req.path and req.originalUrl to ensure we catch the registration route
    const path = req.path || req.originalUrl || "";
    if (path.includes("/users/register")) {
      return next();
    }
    // Apply rate limiting to all other /api/auth routes (login endpoints)
    return authLimiter(req, res, next);
  };
};

module.exports = {
  createAuthLimiter,
  createAdminLimiter,
  createGeneralApiLimiter,
  createAuthRateLimitMiddleware,
};
