/**
 * Check validation and return massage
 * @path {Object} form name of the package
 * @path {ArrayObject} requireFields type of the script
 */
export const validateForm = (form, requireFields) => {
  const errors = [];
  for (let i in requireFields) {
    if (requireFields[i].type === "object") {
      if (!form[requireFields[i].path][requireFields[i].value].trim().length) {
        errors.push({
          path: requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (requireFields[i].type === "array") {
      if (!form[requireFields[i].path].length) {
        errors.push({
          path: requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (requireFields[i].type === "number") {
      if (isNaN(form[requireFields[i].path])) {
        errors.push({
          path: requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (requireFields[i].validator) {
      const value = form[requireFields[i].path];
      if (!requireFields[i].validator(value)) {
        errors.push({
          path: requireFields[i].actualParam || requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (requireFields[i].cond) {
      const trimData = requireFields[i].value.trim();
      if (!requireFields[i].cond(trimData)) {
        errors.push({
          path: requireFields[i].actualParam || requireFields[i].path,
          msg: requireFields[i].msg,
        });
      }
    } else if (
      !form[requireFields[i].path].toString().length ||
      !form[requireFields[i].path].toString().trim().length
    ) {
      errors.push({
        path: requireFields[i].actualParam || requireFields[i].path,
        msg: requireFields[i].msg,
      });
    }
  }
  if (errors.length) {
    return errors;
  }
  return errors;
};

/**
 * Normalize UTR / transaction reference for donation forms.
 * @param {string} value
 * @returns {string}
 */
export const normalizeTransactionReference = (value) =>
  String(value || "")
    .trim()
    .replace(/[\s-]/g, "")
    .toUpperCase();

/**
 * Validate UTR or transaction reference (UPI txn ID / bank UTR).
 * @param {string} value
 * @returns {{ valid: boolean, sanitized: string, error: string | null }}
 */
export const validateTransactionReference = (value) => {
  const sanitized = normalizeTransactionReference(value);

  if (!sanitized) {
    return {
      valid: false,
      sanitized: "",
      error: "UTR / transaction reference number is required.",
    };
  }

  if (!/^[A-Z0-9]{8,22}$/.test(sanitized)) {
    return {
      valid: false,
      sanitized: "",
      error:
        "Enter a valid UTR or transaction reference (8-22 letters and numbers only).",
    };
  }

  return { valid: true, sanitized, error: null };
};
