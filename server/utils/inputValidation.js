/**
 * Input Validation and Sanitization Utility
 *
 * This module provides comprehensive validation and sanitization functions
 * to prevent injection attacks, XSS, and ensure data integrity.
 */

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== "string") {
    return String(input);
  }

  // Remove HTML/script tags
  let sanitized = input.replace(/<[^>]*>/g, "");

  // Remove MongoDB operators
  sanitized = sanitized.replace(/\$[a-zA-Z]+/g, "");

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
};

/**
 * Convert a name-like string to Title Case (e.g. "ravi raj singh" -> "Ravi Raj Singh").
 * Collapses repeated whitespace and lower-cases the rest of each word.
 * @param {string} input - Input string to title-case
 * @returns {string} - Title-cased string (empty string for non-strings)
 */
const toTitleCase = (input) => {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word,
    )
    .join(" ");
};

/**
 * Validate and sanitize email address
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { valid: false, sanitized: "", error: "Email is required" };
  }

  const sanitized = sanitizeString(email).toLowerCase();

  // Require a valid domain with TLD (e.g. user@example.com)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized: "", error: "Invalid email format" };
  }

  const domain = sanitized.split("@")[1];
  if (!domain || domain.split(".").pop().length < 2) {
    return { valid: false, sanitized: "", error: "Invalid email format" };
  }

  if (sanitized.length > 254) {
    return {
      valid: false,
      sanitized: "",
      error: "Email is too long (max 254 characters)",
    };
  }

  const parts = sanitized.split("@");
  if (parts[0].length > 64) {
    return {
      valid: false,
      sanitized: "",
      error: "Email local part is too long",
    };
  }

  return { valid: true, sanitized, error: null };
};

/**
 * Validate and sanitize phone number (10 digits only)
 * @param {string|number} phone - Phone number to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
const validatePhone = (phone) => {
  if (!phone) {
    return { valid: false, sanitized: "", error: "Phone number is required" };
  }

  // Convert to string and remove all non-digit characters
  const phoneStr = String(phone).replace(/\D/g, "");

  // Must be exactly 10 digits
  if (!/^[0-9]{10}$/.test(phoneStr)) {
    return {
      valid: false,
      sanitized: "",
      error: "Phone number must be exactly 10 digits",
    };
  }

  return { valid: true, sanitized: phoneStr, error: null };
};

/**
 * Validate and sanitize UPI ID
 * Format: alphanumeric, dots, hyphens, underscores, followed by @ and domain
 * @param {string} upi - UPI ID to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
const validateUPI = (upi) => {
  if (!upi || typeof upi !== "string") {
    return { valid: false, sanitized: "", error: "UPI ID is required" };
  }

  const sanitized = sanitizeString(upi);

  // UPI format: user@paytm, user@upi, etc.
  // Pattern: 2+ alphanumeric/dot/hyphen/underscore characters @ 2+ alphabetic characters
  const upiPattern = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

  if (!upiPattern.test(sanitized)) {
    return {
      valid: false,
      sanitized: "",
      error: "Invalid UPI ID format. Expected format: user@paytm",
    };
  }

  return { valid: true, sanitized, error: null };
};

/**
 * Validate and sanitize UTR / transaction reference number.
 * Accepts UPI txn IDs and bank UTR values (letters + numbers).
 * @param {string} utr - UTR or transaction reference to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
const validateUTR = (utr) => {
  if (utr === null || utr === undefined || typeof utr !== "string") {
    return {
      valid: false,
      sanitized: "",
      error: "UTR / transaction reference number is required",
    };
  }

  const sanitized = sanitizeString(utr).replace(/[\s-]/g, "").toUpperCase();

  if (!sanitized) {
    return {
      valid: false,
      sanitized: "",
      error: "UTR / transaction reference number is required",
    };
  }

  if (!/^[A-Z0-9]{8,22}$/.test(sanitized)) {
    return {
      valid: false,
      sanitized: "",
      error:
        "Enter a valid UTR or transaction reference using 8-22 letters and numbers only",
    };
  }

  return { valid: true, sanitized, error: null };
};

/**
 * Validate and sanitize amount (positive number)
 * @param {number|string} amount - Amount to validate
 * @returns {object} - { valid: boolean, sanitized: number, error: string }
 */
const validateAmount = (amount) => {
  if (amount === null || amount === undefined || amount === "") {
    return { valid: false, sanitized: 0, error: "Amount is required" };
  }

  // Convert to number
  const numAmount =
    typeof amount === "string" ? parseFloat(amount) : Number(amount);

  // Check if valid number
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return {
      valid: false,
      sanitized: 0,
      error: "Amount must be a valid number",
    };
  }

  // Must be positive
  if (numAmount <= 0) {
    return {
      valid: false,
      sanitized: 0,
      error: "Amount must be greater than 0",
    };
  }

  // Round to 2 decimal places
  const sanitized = Math.round(numAmount * 100) / 100;

  return { valid: true, sanitized, error: null };
};

/**
 * Validate and sanitize referral ID (Member ID format)
 * Format: 10-digit-phone-2-digit-sequence (e.g., 9876543210-01)
 * @param {string} referralId - Referral ID to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
const validateReferralId = (referralId) => {
  if (!referralId || typeof referralId !== "string") {
    return {
      valid: false,
      sanitized: "",
      error: "Referral ID must be a string",
    };
  }

  const sanitized = sanitizeString(referralId);

  // Member ID format: 10-digit-phone-2-digit-sequence
  if (!/^\d{10}-\d{2}$/.test(sanitized)) {
    return {
      valid: false,
      sanitized: "",
      error:
        "Invalid referral ID format. Expected format: 10-digit-phone-2-digit-sequence (e.g., 9876543210-01)",
    };
  }

  return { valid: true, sanitized, error: null };
};

/**
 * Validate and sanitize Member ID
 * Format: 10-digit-phone-2-digit-sequence (e.g., 9876543210-01)
 * @param {string} memberId - Member ID to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
const validateMemberId = (memberId) => {
  if (!memberId || typeof memberId !== "string") {
    return { valid: false, sanitized: "", error: "Member ID is required" };
  }

  const sanitized = sanitizeString(memberId);

  // Member ID format: 10-digit-phone-2-digit-sequence
  if (!/^\d{10}-\d{2}$/.test(sanitized)) {
    return {
      valid: false,
      sanitized: "",
      error:
        "Invalid Member ID format. Expected format: 10-digit-phone-2-digit-sequence (e.g., 9876543210-01)",
    };
  }

  return { valid: true, sanitized, error: null };
};

/**
 * Sanitize object to prevent MongoDB injection
 * Recursively sanitizes all string values in an object
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  // Return non-objects and null as-is to prevent errors
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    // Use Object.prototype.hasOwnProperty.call for safety (works even if obj has no prototype)
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Sanitize key
      const sanitizedKey = sanitizeString(key);

      // Skip MongoDB operators in keys
      if (sanitizedKey.startsWith("$")) {
        continue;
      }

      const value = obj[key];

      if (typeof value === "string") {
        sanitized[sanitizedKey] = sanitizeString(value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }
  }

  return sanitized;
};

/**
 * Check if string contains dangerous patterns
 * @param {string} input - Input to check
 * @returns {boolean} - True if dangerous patterns found
 */
const containsDangerousPatterns = (input) => {
  if (typeof input !== "string") {
    return false;
  }

  // Check for HTML/script tags
  if (/<[^>]*>/g.test(input)) {
    return true;
  }

  // Check for MongoDB operators
  if (/\$[a-zA-Z]+/.test(input)) {
    return true;
  }

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /[';\\\/\*\+\|\&\%]/,
    /--/,
    /\/\*/,
    /\*\//,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if string contains dangerous patterns when used as a URL field value.
 * Relaxes SQL-style character checks (e.g. / : & % ?) that cause false positives
 * for valid URLs, while still blocking XSS (html/script, javascript:, data:, etc.)
 * and MongoDB operators.
 *
 * @param {string} input - Input to check (URL or URL-like string)
 * @returns {boolean} - True if dangerous patterns found
 */
const containsDangerousPatternsForUrl = (input) => {
  if (typeof input !== "string") {
    return false;
  }
  // Block HTML/script tags (XSS)
  if (/<[^>]*>/g.test(input)) {
    return true;
  }
  // Block MongoDB operators
  if (/\$[a-zA-Z]+/.test(input)) {
    return true;
  }
  // Block dangerous protocols (XSS)
  if (/\b(javascript|data|vbscript):/i.test(input.trim())) {
    return true;
  }
  return false;
};

/** @deprecated Use containsDangerousPatternsForUrl */
const containsDangerousPatternsForSocialUrl = containsDangerousPatternsForUrl;

/**
 * Check if string contains dangerous patterns when used as free-form content.
 * Relaxes SQL-style character checks (e.g. apostrophes in "women's") that cause
 * false positives for admin-managed copy, while still blocking XSS and MongoDB operators.
 *
 * @param {string} input - Input to check
 * @returns {boolean} - True if dangerous patterns found
 */
const containsDangerousPatternsForContent = (input) => {
  if (typeof input !== "string") {
    return false;
  }
  if (/<[^>]*>/g.test(input)) {
    return true;
  }
  if (/\$[a-zA-Z]+/.test(input)) {
    return true;
  }
  if (/\b(javascript|data|vbscript):/i.test(input.trim())) {
    return true;
  }
  return false;
};

const URL_FIELD_NAMES = new Set([
  "embedUrl",
  "imageUrl",
  "url",
  "link",
  "logoUrl",
  "path",
]);

const CONTENT_FIELD_NAMES = new Set([
  "donationMessage",
  "donationTitle",
  "donationTitleHighlight",
  "intro",
  "description",
  "heading",
  "tagline",
  "title",
  "rejectionReason",
  "buttonText",
  "label",
  "mission",
  "vision",
  "businessHours",
  "address",
  "name",
  "accountHolderName",
  "upiHolderName",
  "bankName",
  "donorName",
  "abbreviation",
]);

// Enum / short values that legitimately include chars blocked by SQL patterns (e.g. A+)
const RELAXED_VALUE_FIELD_NAMES = new Set(["bloodGroup"]);

const isUrlFieldName = (key) => URL_FIELD_NAMES.has(key);
const isContentFieldName = (key) => CONTENT_FIELD_NAMES.has(key);
const isRelaxedValueFieldName = (key) => RELAXED_VALUE_FIELD_NAMES.has(key);

/**
 * Sanitize request body to prevent injection attacks
 * @param {object} body - Request body to sanitize
 * @returns {object} - Sanitized request body
 */
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== "object") {
    return body;
  }

  return sanitizeObject(body);
};

module.exports = {
  sanitizeString,
  toTitleCase,
  validateEmail,
  validatePhone,
  validateUPI,
  validateUTR,
  validateAmount,
  validateReferralId,
  validateMemberId,
  sanitizeObject,
  sanitizeRequestBody,
  containsDangerousPatterns,
  containsDangerousPatternsForUrl,
  containsDangerousPatternsForSocialUrl,
  containsDangerousPatternsForContent,
  isUrlFieldName,
  isContentFieldName,
  isRelaxedValueFieldName,
};
