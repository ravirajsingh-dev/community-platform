const NAME_UNSAFE_HTML_REGEX = /<[^>]*>/g;
const NAME_UNSAFE_OPERATOR_REGEX = /\$[a-zA-Z]+/;
const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

export const sanitizePhone = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

export const sanitizeEmail = (value) => String(value ?? "").replace(/\s+/g, "");

export const sanitizeName = (value) =>
  String(value ?? "").replace(/\s{2,}/g, " ");

export const isValidPhone = (value) =>
  TEN_DIGIT_PHONE_REGEX.test(String(value || "").trim());

export const isValidEmail = (value) =>
  EMAIL_REGEX.test(String(value || "").trim());

export const isValidName = (value, { min = 3, max = 50 } = {}) => {
  const normalized = String(value || "").trim();
  return (
    normalized.length >= min &&
    normalized.length <= max &&
    !NAME_UNSAFE_HTML_REGEX.test(normalized) &&
    !NAME_UNSAFE_OPERATOR_REGEX.test(normalized)
  );
};
