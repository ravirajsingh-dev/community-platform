var bcrypt = require("bcryptjs");
const axios = require("axios");

const {
  CASHFREE_MODE,
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
} = require("../config/config");

const emailRegex =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

module.exports.isEmailValid = (email) => {
  if (!email) return false;

  if (email.length > 254) return false;

  var valid = emailRegex.test(email);
  if (!valid) return false;

  // Further checking of some things regex can't handle
  var parts = email.split("@");
  if (parts[0].length > 64) return false;

  var domainParts = parts[1].split(".");
  if (
    domainParts.some(function (part) {
      return part.length > 63;
    })
  )
    return false;

  return true;
};

module.exports.isAdminIDValid = (adminId) => {
  if (!adminId || typeof adminId !== "string") return false;

  // Trim whitespace
  const trimmedId = adminId.trim();

  // Check length first (8-15 characters as per schema)
  if (trimmedId.length < 8 || trimmedId.length > 15) return false;

  // Admin ID validation: alphanumeric only (letters and numbers), case-insensitive
  // Pattern: 8-15 alphanumeric characters
  const adminIDRegex = /^[A-Z0-9]+$/i;
  return adminIDRegex.test(trimmedId);
};

module.exports.comparePasswords = async (plainPassword, hashedPassword) => {
  try {
    const validPassword = await bcrypt.compare(plainPassword, hashedPassword);
    return validPassword;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
};

module.exports.parseTokenExpiryTime = (tokenExpiryTime) => {
  const unit = tokenExpiryTime.slice(-1);
  const value = parseInt(tokenExpiryTime.slice(0, -1));

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    case "s":
      return value * 1000;
    default:
      throw new Error("Invalid token expiry time unit");
  }
};

module.exports.generateNumericPassword = (length = 4) => {
  const digits = "0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += digits.charAt(Math.floor(Math.random() * digits.length));
  }

  return password;
};

/**
 * Generate Member ID based on phone number with sequence
 * Format: <phone>-<2 digit sequence> (e.g., 9876543210-01)
 * This is a helper function - transaction handling should be done in the caller
 */
module.exports.generateMemberIdFromPhone = async (phone, session = null) => {
  const User = require("../models/User");

  // Ensure phone is a string
  const phoneStr = String(phone).trim();

  if (!phoneStr || phoneStr.length !== 10) {
    throw new Error("Invalid phone number format");
  }

  // Find existing users with this phone number and extract their sequence numbers
  const query = User.find({ phone: phoneStr }).select("memberId");
  const existingUsers = session
    ? await query.session(session).lean()
    : await query.lean();

  // Extract sequence numbers from existing member IDs
  const existingSequences = existingUsers
    .map((user) => {
      // Parse member ID format: <phone>-<sequence>
      const match = user.memberId ? user.memberId.match(/-(\d{2})$/) : null;
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((seq) => seq !== null && !isNaN(seq));

  // Find the maximum sequence number, default to 0 if none exist
  const maxSequence =
    existingSequences.length > 0 ? Math.max(...existingSequences) : 0;

  // Calculate next sequence number (01, 02, ... 99)
  const nextSequence = maxSequence + 1;

  // Check if max sequence (99) is reached
  if (nextSequence > 99) {
    throw new Error(
      `Maximum number of users (99) reached for phone number ${phoneStr}`,
    );
  }

  // Generate memberId with 2-digit padded sequence
  const sequenceStr = String(nextSequence).padStart(2, "0");
  const memberId = `${phoneStr}-${sequenceStr}`;

  // Double-check for collision (safety check in case of race condition)
  const existingMemberId = session
    ? await User.findOne({ memberId }).session(session).lean()
    : await User.findOne({ memberId }).lean();

  if (existingMemberId) {
    // If collision detected, try next sequence number (retry once)
    const retrySequence = nextSequence + 1;
    if (retrySequence > 99) {
      throw new Error(
        `Maximum number of users (99) reached for phone number ${phoneStr}`,
      );
    }
    const retrySequenceStr = String(retrySequence).padStart(2, "0");
    return `${phoneStr}-${retrySequenceStr}`;
  }

  return memberId;
};

const getCashfreeApiBaseUrl = () =>
  String(CASHFREE_MODE).toLowerCase() === "sandbox"
    ? "https://sandbox.cashfree.com"
    : "https://api.cashfree.com";

const getCashfreeRequestHeaders = () => ({
  "x-api-version": "2023-08-01",
  "x-client-id": CASHFREE_APP_ID,
  "x-client-secret": CASHFREE_SECRET_KEY,
});

module.exports.getCashfreePaymentDetails = async (orderId) => {
  const url = `${getCashfreeApiBaseUrl()}/pg/orders/${orderId}/payments`;

  try {
    const { data } = await axios.get(url, {
      headers: getCashfreeRequestHeaders(),
    });

    return data;
  } catch (err) {
    console.error(
      "Error fetching payment details:",
      err.response?.data || err.message,
    );
    throw err;
  }
};

module.exports.getCashfreeOrderDetails = async (orderId) => {
  const url = `${getCashfreeApiBaseUrl()}/pg/orders/${orderId}`;

  try {
    const { data } = await axios.get(url, {
      headers: getCashfreeRequestHeaders(),
    });

    return data;
  } catch (err) {
    console.error(
      "Error fetching order details:",
      err.response?.data || err.message,
    );
    throw err;
  }
};
