const { EDUCATION_VALUES } = require("../config/educationConstants");

const MAX_EDUCATIONS = 5;
const EDUCATION_ITEM_MAX_LENGTH = 300;

/**
 * Coerce legacy string or array into a string[] (no enum validation).
 * null / undefined / "" → []
 */
function toEducationArray(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (item == null ? "" : String(item).trim()))
      .filter((item) => item !== "");
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

/**
 * Ensure lean userDetails.education is always an array (legacy string → [string]).
 */
function ensureEducationArray(userDetails) {
  if (!userDetails || typeof userDetails !== "object") return userDetails;
  userDetails.education = toEducationArray(userDetails.education);
  return userDetails;
}

/**
 * Validate + normalize education for writes.
 * Accepts legacy string or string[]. Empty → [].
 *
 * @returns {{ ok: true, value: string[] } | { ok: false, errors: Array<{ path: string, msg: string }> }}
 */
function validateEducationInput(raw) {
  if (raw !== undefined && raw !== null && raw !== "" && !Array.isArray(raw) && typeof raw !== "string") {
    return {
      ok: false,
      errors: [
        {
          path: "education",
          msg: "Education must be a string or an array of strings",
        },
      ],
    };
  }

  const items = toEducationArray(raw);

  if (items.length > MAX_EDUCATIONS) {
    return {
      ok: false,
      errors: [
        {
          path: "education",
          msg: `You can select at most ${MAX_EDUCATIONS} education values`,
        },
      ],
    };
  }

  const seen = new Set();
  const normalized = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.length > EDUCATION_ITEM_MAX_LENGTH) {
      return {
        ok: false,
        errors: [
          {
            path: `education[${i}]`,
            msg: `Each education value must be at most ${EDUCATION_ITEM_MAX_LENGTH} characters`,
          },
        ],
      };
    }
    if (!EDUCATION_VALUES.includes(item)) {
      return {
        ok: false,
        errors: [
          {
            path: `education[${i}]`,
            msg: "Education must be one of the allowed dropdown values",
          },
        ],
      };
    }
    if (seen.has(item)) {
      return {
        ok: false,
        errors: [
          {
            path: `education[${i}]`,
            msg: "Duplicate education values are not allowed",
          },
        ],
      };
    }
    seen.add(item);
    normalized.push(item);
  }

  return { ok: true, value: normalized };
}

module.exports = {
  MAX_EDUCATIONS,
  EDUCATION_ITEM_MAX_LENGTH,
  toEducationArray,
  ensureEducationArray,
  validateEducationInput,
};
