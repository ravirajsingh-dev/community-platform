// Get secure cookie options
// In development (e.g. localhost over HTTP), secure must be false or cookies are not sent by the browser
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: isProduction, // HTTPS only in production; false in dev so cookies work on http://localhost
    // Lax allows auth cookies on top-level return navigations (e.g. Cashfree payment redirect).
    sameSite: "lax",
  };
};

/**
 * Set access token as an HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} token - JWT access token
 * @param {string} prefix - Optional prefix for cookie name (e.g., "user_", "admin_")
 */
const setAuthTokenCookie = (res, token, prefix = "") => {
  const cookieName = prefix ? `${prefix}token` : "token";
  res.cookie(cookieName, token, getCookieOptions());
};

/**
 * Set refresh token as an HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} token - JWT refresh token
 * @param {string} prefix - Optional prefix for cookie name (e.g., "user_", "admin_")
 */
const setAuthRefreshTokenCookie = (res, token, prefix = "") => {
  const cookieName = prefix ? `${prefix}refreshToken` : "refreshToken";
  res.cookie(cookieName, token, getCookieOptions());
};

/**
 * Set sessionID cookie
 * @param {Object} res - Express response object
 * @param {string} sessionID - Session ID
 * @param {string} prefix - Optional prefix for cookie name (e.g., "user_", "admin_")
 */
const setSessionIDCookie = (res, sessionID, prefix = "") => {
  const cookieName = prefix ? `${prefix}sessionID` : "sessionID";
  res.cookie(cookieName, sessionID, getCookieOptions());
};

/**
 * Set all auth cookies from a session or token bundle.
 */
const setSessionAuthCookies = (
  res,
  { accessToken, refreshToken, sessionID },
  prefix = "",
) => {
  setAuthTokenCookie(res, accessToken, prefix);
  setAuthRefreshTokenCookie(res, refreshToken, prefix);
  setSessionIDCookie(res, sessionID, prefix);
};

/**
 * Clear authentication cookies (access token, refresh token, and sessionID)
 * @param {Object} res - Express response object
 * @param {string} prefix - Optional prefix for cookie names ("user_", "admin_", or empty for old cookie names)
 */
const clearAuthCookies = (res, prefix = "") => {
  if (prefix === "user_") {
    // Clear only user-prefixed cookies
    res.clearCookie("user_token", getCookieOptions());
    res.clearCookie("user_refreshToken", getCookieOptions());
    res.clearCookie("user_sessionID", getCookieOptions());
  } else if (prefix === "admin_") {
    // Clear only admin-prefixed cookies
    res.clearCookie("admin_token", getCookieOptions());
    res.clearCookie("admin_refreshToken", getCookieOptions());
    res.clearCookie("admin_sessionID", getCookieOptions());
  } else {
    // No prefix provided - clear old cookie names for backward compatibility
    res.clearCookie("token", getCookieOptions());
    res.clearCookie("refreshToken", getCookieOptions());
    res.clearCookie("sessionID", getCookieOptions());
  }
};

const clearUserAuthCookies = (res) => {
  clearAuthCookies(res, "user_");
  clearAuthCookies(res, "");
};

const clearAdminAuthCookies = (res) => {
  clearAuthCookies(res, "admin_");
  clearAuthCookies(res, "");
};

module.exports = {
  setAuthTokenCookie,
  setAuthRefreshTokenCookie,
  setSessionIDCookie,
  setSessionAuthCookies,
  clearAuthCookies,
  clearUserAuthCookies,
  clearAdminAuthCookies,
  getCookieOptions,
};
