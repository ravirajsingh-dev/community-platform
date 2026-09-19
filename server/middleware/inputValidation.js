/**
 * Input Validation Middleware
 *
 * This middleware validates and sanitizes user inputs before they reach controllers
 */

const {
  validateEmail,
  validatePhone,
  validateUPI,
  validateUTR,
  validateAmount,
  validateReferralId,
  validateMemberId,
  sanitizeRequestBody,
  containsDangerousPatterns,
  containsDangerousPatternsForUrl,
  containsDangerousPatternsForSocialUrl,
  containsDangerousPatternsForContent,
  isUrlFieldName,
  isContentFieldName,
  isRelaxedValueFieldName,
} = require("../utils/inputValidation");
const { sanitizeValidationError } = require("../utils/errorSanitizer");

/**
 * Middleware to sanitize request body
 */
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeRequestBody(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeRequestBody(req.query);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeRequestBody(req.params);
  }

  next();
};

/**
 * Validate email field
 */
const validateEmailField = (fieldName = "email") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateEmail(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate phone field
 */
const validatePhoneField = (fieldName = "phone") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validatePhone(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate UPI field
 */
const validateUPIField = (fieldName = "upiId") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateUPI(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate UTR field
 */
const validateUTRField = (fieldName = "utrNumber") => {
  return (req, res, next) => {
    const rawValue = req.body[fieldName];

    if (
      rawValue === undefined ||
      rawValue === null ||
      String(rawValue).trim() === ""
    ) {
      return res.status(400).json({
        errors: [
          {
            path: fieldName,
            msg: "UTR / transaction reference number is required",
          },
        ],
        message: "Validation error",
      });
    }

    const result = validateUTR(rawValue);
    if (!result.valid) {
      return res.status(400).json({
        errors: [
          { path: fieldName, msg: sanitizeValidationError(result.error) },
        ],
        message: "Validation error",
      });
    }
    req.body[fieldName] = result.sanitized;
    next();
  };
};

/**
 * Validate amount field
 */
const validateAmountField = (fieldName = "amount") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateAmount(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate referral ID field
 */
const validateReferralIdField = (fieldName = "referralId") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateReferralId(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Validate Member ID field
 */
const validateMemberIdField = (fieldName = "memberId") => {
  return (req, res, next) => {
    if (
      req.body[fieldName] !== undefined &&
      req.body[fieldName] !== null &&
      req.body[fieldName] !== ""
    ) {
      const result = validateMemberId(req.body[fieldName]);
      if (!result.valid) {
        return res.status(400).json({
          errors: [
            { path: fieldName, msg: sanitizeValidationError(result.error) },
          ],
          message: "Validation error",
        });
      }
      req.body[fieldName] = result.sanitized;
    }
    next();
  };
};

/**
 * Check for dangerous patterns in request body.
 * Uses relaxed URL-aware checks for known URL fields (embedUrl, imageUrl, social links, etc.).
 */
const checkDangerousPatterns = (req, res, next) => {
  const checkValue = (value, isUrlContext = false, isContentContext = false) => {
    if (typeof value === "string") {
      const isDangerous = isUrlContext
        ? containsDangerousPatternsForUrl(value)
        : isContentContext
          ? containsDangerousPatternsForContent(value)
          : containsDangerousPatterns(value);
      if (isDangerous) {
        return true;
      }
    } else if (typeof value === "object" && value !== null) {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (containsDangerousPatterns(key)) {
            return true;
          }
          const nextIsUrlContext =
            isUrlContext ||
            (value === req.body && key === "socialMedia") ||
            isUrlFieldName(key);
          const nextIsContentContext =
            isContentContext ||
            (value === req.body &&
              (key === "aboutUs" ||
                key === "comingSoon" ||
                key === "contactUsPage" ||
                key === "hero")) ||
            isContentFieldName(key) ||
            isRelaxedValueFieldName(key);
          if (
            checkValue(value[key], nextIsUrlContext, nextIsContentContext)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  if (req.body && checkValue(req.body)) {
    return res.status(400).json({
      errors: [{ msg: "Input contains potentially dangerous patterns" }],
      message: "Invalid input detected",
    });
  }

  if (req.query && checkValue(req.query)) {
    return res.status(400).json({
      errors: [
        { msg: "Query parameters contain potentially dangerous patterns" },
      ],
      message: "Invalid input detected",
    });
  }

  next();
};

module.exports = {
  sanitizeInput,
  validateEmailField,
  validatePhoneField,
  validateUPIField,
  validateUTRField,
  validateAmountField,
  validateReferralIdField,
  validateMemberIdField,
  checkDangerousPatterns,
};
