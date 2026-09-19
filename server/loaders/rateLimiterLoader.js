/**
 * Rate Limiter Loader Module
 * 
 * Loads and applies rate limiting middleware to specific route groups.
 * Rate limiter configurations are loaded from config/rateLimiterConfig.js.
 * 
 * Rate limiters are applied in order of specificity:
 * 1. Auth routes (most restrictive)
 * 2. Admin routes (moderate restriction)
 * 3. General API routes (standard restriction)
 */

const {
  createAuthLimiter,
  createAdminLimiter,
  createGeneralApiLimiter,
  createAuthRateLimitMiddleware,
} = require("../config/rateLimiterConfig");

/**
 * Load rate limiting middleware
 * @param {Express} app - Express application instance
 */
const loadRateLimiters = (app) => {
  // Create rate limiter instances
  const authLimiter = createAuthLimiter();
  const adminLimiter = createAdminLimiter();
  const generalApiLimiter = createGeneralApiLimiter();

  // Create conditional auth rate limiter (excludes registration route)
  const authRateLimitMiddleware = createAuthRateLimitMiddleware(authLimiter);

  // Apply rate limiters to specific route groups
  // Note: Order matters - more specific paths should be registered first
  // Authentication routes (most restrictive - 15 requests per 15 minutes)
  // This covers: /api/auth (user login), /api/auth/admin (admin login)
  // EXCLUDES: /api/auth/users/register (registration) - no rate limiting for registration
  app.use("/api/auth", authRateLimitMiddleware);

  // Admin routes (moderate restriction - 50 requests per 15 minutes)
  // This covers all /api/admin/* routes except /api/auth/admin (which is handled above)
  app.use("/api/admin", adminLimiter);

  // General API routes (standard restriction - 100 requests per 15 minutes)
  app.use("/api/users", generalApiLimiter);
  app.use("/api/common", generalApiLimiter);

  console.log("✅ Rate limiting middleware loaded");
};

module.exports = {
  loadRateLimiters,
};
