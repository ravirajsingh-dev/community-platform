import {
  TAB_KEYS,
  ADDITIONAL_REQUIRED_FIELDS,
  COMMUNITY_FIELDS,
  LOCATION_REQUIRED_FIELDS,
} from "@src/views/Layout/MyAccount/myAccountConstants";

/** Fallback when server requirements not yet loaded (mirrors server config). */
export const FALLBACK_REQUIREMENTS = {
  profile: {
    user: [],
    userDetails: [
      ...ADDITIONAL_REQUIRED_FIELDS,
      ...COMMUNITY_FIELDS,
      ...LOCATION_REQUIRED_FIELDS,
    ],
  },
  matrimonial: {
    user: ["name", "phone"],
    userDetails: [
      ...ADDITIONAL_REQUIRED_FIELDS,
      ...COMMUNITY_FIELDS,
      ...LOCATION_REQUIRED_FIELDS,
      "height",
      "weight",
      "education",
      "occupation",
      "countryCode",
    ],
  },
  matrimonialExtra: ["height", "weight", "education", "occupation"],
  fieldLabels: {
    name: "Full Name",
    phone: "Phone",
    dob: "Date of Birth",
    gender: "Gender",
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    height: "Height",
    weight: "Weight",
    address: "Address",
    countryCode: "Country",
    stateCode: "State",
    cityId: "City",
    community: "Community",
    vansh: "Vansh",
    kul: "Kul",
    khamp: "Khamp",
    subKhamp: "Sub-Khamp",
    gotra: "Gotra",
    maritalStatus: "Marital Status",
    education: "Education",
    occupation: "Occupation",
    profile: "Profile Details",
  },
  fieldTabs: {
    name: TAB_KEYS.core,
    phone: TAB_KEYS.core,
    dob: TAB_KEYS.additional,
    gender: TAB_KEYS.additional,
    fatherName: TAB_KEYS.additional,
    motherName: TAB_KEYS.additional,
    maritalStatus: TAB_KEYS.additional,
    education: TAB_KEYS.additional,
    occupation: TAB_KEYS.additional,
    height: TAB_KEYS.additional,
    weight: TAB_KEYS.additional,
    community: TAB_KEYS.community,
    vansh: TAB_KEYS.community,
    kul: TAB_KEYS.community,
    khamp: TAB_KEYS.community,
    subKhamp: TAB_KEYS.community,
    gotra: TAB_KEYS.community,
    stateCode: TAB_KEYS.location,
    cityId: TAB_KEYS.location,
    address: TAB_KEYS.location,
    countryCode: TAB_KEYS.location,
    profile: TAB_KEYS.core,
  },
};

const REF_FIELDS = new Set([...COMMUNITY_FIELDS, "villageId"]);
const SELECT_FIELDS = new Set([
  "stateCode",
  "cityId",
  ...COMMUNITY_FIELDS,
  "villageId",
]);

export const resolveRequirements = (requirements) =>
  requirements?.profile ? requirements : FALLBACK_REQUIREMENTS;

export const isEmptyProfileValue = (key, value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (typeof value === "number" && Number.isNaN(value)) return true;
  // education (and any other multi fields) — empty array = not set
  if (Array.isArray(value)) return value.length === 0;

  if (SELECT_FIELDS.has(key) || REF_FIELDS.has(key)) {
    if (typeof value === "object") {
      if (value._id) return false;
      if ("value" in value) return value.value == null || value.value === "";
    }
    return false;
  }

  return false;
};

const USER_LEVEL_KEYS = new Set(["name", "phone", "status"]);

const getKeysForContext = (requirements, context) => {
  const req = resolveRequirements(requirements);
  if (context === "matrimonial") {
    return {
      userKeys: req.matrimonial?.user || [],
      userDetailsKeys: req.matrimonial?.userDetails || [],
      matrimonialExtra: req.matrimonialExtra || [],
    };
  }
  return {
    userKeys: req.profile?.user || [],
    userDetailsKeys: req.profile?.userDetails || [],
    matrimonialExtra: req.matrimonialExtra || [],
  };
};

export const toMissingField = (key, requirements, scope = "profile") => {
  const req = resolveRequirements(requirements);
  const matrimonialExtra = req.matrimonialExtra || [];
  return {
    key,
    label: req.fieldLabels?.[key] || key,
    tab: req.fieldTabs?.[key] || TAB_KEYS.core,
    scope: matrimonialExtra.includes(key) ? "matrimonial" : "profile",
  };
};

/**
 * @param {object|null} user
 * @param {object|null} userDetails
 * @param {object|null} requirements - from server API
 * @param {"profile"|"matrimonial"|"matrimonialExtra"} context
 */
export const getMissingProfileFields = (
  user,
  userDetails,
  requirements,
  context = "profile",
) => {
  if (!userDetails) {
    return [toMissingField("profile", requirements, "profile")];
  }

  const { userKeys, userDetailsKeys, matrimonialExtra } = getKeysForContext(
    requirements,
    context === "matrimonialExtra" ? "matrimonial" : context,
  );

  let keysToCheck = [...userKeys, ...userDetailsKeys];
  if (context === "matrimonialExtra") {
    keysToCheck = matrimonialExtra;
  } else if (context === "profile") {
    keysToCheck = [...userKeys, ...userDetailsKeys];
  }

  const missing = [];
  keysToCheck.forEach((key) => {
    const value = USER_LEVEL_KEYS.has(key) ? user?.[key] : userDetails?.[key];
    if (isEmptyProfileValue(key, value)) {
      missing.push(toMissingField(key, requirements));
    }
  });

  return missing;
};

/** Missing general profile fields (excludes matrimonial-only extras). */
export const getMissingGeneralProfileFields = (user, userDetails, requirements) =>
  getMissingProfileFields(user, userDetails, requirements, "profile");

/** Missing matrimonial-only extras (height, education, etc.). */
export const getMissingMatrimonialExtraFields = (user, userDetails, requirements) =>
  getMissingProfileFields(user, userDetails, requirements, "matrimonialExtra");

/** Count missing fields grouped by My Account tab. */
export const getMissingCountByTab = (missingFields) => {
  const counts = {
    [TAB_KEYS.core]: 0,
    [TAB_KEYS.additional]: 0,
    [TAB_KEYS.community]: 0,
    [TAB_KEYS.location]: 0,
  };

  missingFields.forEach((field) => {
    if (field.key === "profile") return;
    if (counts[field.tab] !== undefined) {
      counts[field.tab] += 1;
    }
  });

  return counts;
};

/** Normalize API matrimonial missingFields to shared shape. */
export const normalizeApiMissingFields = (apiFields = [], requirements) => {
  const req = resolveRequirements(requirements);
  return apiFields.map((field) => {
    const key = field.path || field.key;
    const matrimonialExtra = req.matrimonialExtra || [];
    return {
      key,
      label: field.label || req.fieldLabels?.[key] || key,
      tab: req.fieldTabs?.[key] || TAB_KEYS.core,
      scope: matrimonialExtra.includes(key) ? "matrimonial" : "profile",
    };
  });
};

export const groupMissingFieldsByScope = (fields) => {
  const profileFields = fields.filter((f) => f.scope === "profile");
  const matrimonialFields = fields.filter((f) => f.scope === "matrimonial");
  return { profileFields, matrimonialFields };
};

export const canApplyForMatrimonial = (
  user,
  userDetails,
  requirements,
) => {
  const req = resolveRequirements(requirements);
  const profileMissing = getMissingGeneralProfileFields(
    user,
    userDetails,
    requirements,
  );
  const userLevelMissing = (req.matrimonial?.user || [])
    .filter((key) => isEmptyProfileValue(key, user?.[key]))
    .map((key) => toMissingField(key, requirements));
  const allProfileBlocking = [...profileMissing, ...userLevelMissing];
  const extraMissing = getMissingMatrimonialExtraFields(
    user,
    userDetails,
    requirements,
  );
  return {
    profileMissing: allProfileBlocking,
    extraMissing,
    canApply: allProfileBlocking.length === 0 && extraMissing.length === 0,
  };
};
