const User = require("../../models/User");
const UserDetails = require("../../models/UserDetails");
const {
  MATRIMONIAL_USER_REQUIRED,
  getMatrimonialUserDetailsRequired,
  getFieldLabel,
} = require("../../config/profileRequirements");

const REQUIRED_USER_PATHS = MATRIMONIAL_USER_REQUIRED;
const REQUIRED_USER_DETAILS_PATHS = getMatrimonialUserDetailsRequired();

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function getLabel(path) {
  return getFieldLabel(path);
}

/**
 * Validates User and UserDetails for matrimonial application.
 * Returns ALL missing fields so the client can show a clear list and link to profile.
 * @param {mongoose.Types.ObjectId} userId
 * @returns {{ valid: boolean, message?: string, missingFields?: Array<{path: string, label: string}>, user?: object, userDetails?: object }}
 */
async function validateUserAndDetailsForMatrimonial(userId) {
  const missingFields = [];

  const user = await User.findById(userId).lean();
  if (!user) {
    return { valid: false, message: "User not found" };
  }

  if (user.status !== 1) {
    return {
      valid: false,
      message: "User account must be active to apply for Matrimonial",
    };
  }

  for (const path of REQUIRED_USER_PATHS) {
    const value = user[path];
    if (isEmpty(value)) {
      missingFields.push({ path, label: getLabel(path) });
    }
  }

  const userDetails = await UserDetails.findOne({ userId })
    .populate("community")
    .populate("vansh")
    .populate("kul")
    .populate("khamp")
    .populate("subKhamp")
    .populate("gotra")
    .populate("villageId")
    .lean();

  if (!userDetails) {
    return {
      valid: false,
      message:
        "Profile details are required. Please complete your profile first.",
      missingFields: [{ path: "profile", label: "Profile Details" }],
    };
  }

  for (const path of REQUIRED_USER_DETAILS_PATHS) {
    const value = userDetails[path];
    if (isEmpty(value)) {
      missingFields.push({ path, label: getLabel(path) });
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      message:
        "Profile is incomplete. Please complete the required fields before applying for Matrimonial.",
      missingFields,
    };
  }

  return {
    valid: true,
    user,
    userDetails,
  };
}

module.exports = {
  validateUserAndDetailsForMatrimonial,
  REQUIRED_USER_PATHS,
  REQUIRED_USER_DETAILS_PATHS,
  FIELD_LABELS: require("../../config/profileRequirements").FIELD_LABELS,
};
