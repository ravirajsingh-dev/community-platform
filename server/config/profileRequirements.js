/**
 * Single source of truth for profile & matrimonial field requirements.
 * Used by API, matrimonial validation, and client (via GET /api/users/profile-requirements).
 */

const FIELD_LABELS = {
  name: "Full Name",
  phone: "Phone",
  status: "Account Status",
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
  villageId: "Village",
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
};

/** UI tab keys returned to client for deep-linking into My Account. */
const FIELD_TABS = {
  name: "core",
  email: "core",
  alternatePhone: "core",
  phone: "core",
  dob: "additional",
  gender: "additional",
  fatherName: "additional",
  motherName: "additional",
  maritalStatus: "additional",
  education: "additional",
  occupation: "additional",
  height: "additional",
  weight: "additional",
  bloodGroup: "additional",
  community: "community",
  vansh: "community",
  kul: "community",
  khamp: "community",
  subKhamp: "community",
  gotra: "community",
  stateCode: "location",
  cityId: "location",
  villageId: "location",
  address: "location",
  countryCode: "location",
  profile: "core",
};

/** General profile completion (dashboard, most features). */
const PROFILE_USER_REQUIRED = [];

const PROFILE_USER_DETAILS_REQUIRED = [
  "dob",
  "gender",
  "fatherName",
  "motherName",
  "maritalStatus",
  "community",
  "vansh",
  "kul",
  "khamp",
  "subKhamp",
  "gotra",
  "stateCode",
  "cityId",
  "address",
];

/** Matrimonial apply — user-level checks. */
const MATRIMONIAL_USER_REQUIRED = ["name", "phone"];

/**
 * Extra UserDetails fields required only for Matrimonial (optional in general profile).
 */
const MATRIMONIAL_USER_DETAILS_EXTRA = [
  "height",
  "weight",
  "education",
  "occupation",
];

/** Required for matrimonial validation but not shown as user-facing "matrimonial extra". */
const MATRIMONIAL_USER_DETAILS_IMPLICIT = ["countryCode"];

const getMatrimonialUserDetailsRequired = () => [
  ...new Set([
    ...PROFILE_USER_DETAILS_REQUIRED,
    ...MATRIMONIAL_USER_DETAILS_EXTRA,
    ...MATRIMONIAL_USER_DETAILS_IMPLICIT,
  ]),
];

const getFieldLabel = (path) => FIELD_LABELS[path] || path;

const getFieldTab = (path) => FIELD_TABS[path] || "core";

const getProfileRequirementsResponse = () => ({
  profile: {
    user: PROFILE_USER_REQUIRED,
    userDetails: PROFILE_USER_DETAILS_REQUIRED,
  },
  matrimonial: {
    user: MATRIMONIAL_USER_REQUIRED,
    userDetails: getMatrimonialUserDetailsRequired(),
  },
  matrimonialExtra: MATRIMONIAL_USER_DETAILS_EXTRA,
  fieldLabels: FIELD_LABELS,
  fieldTabs: FIELD_TABS,
});

module.exports = {
  FIELD_LABELS,
  FIELD_TABS,
  PROFILE_USER_REQUIRED,
  PROFILE_USER_DETAILS_REQUIRED,
  MATRIMONIAL_USER_REQUIRED,
  MATRIMONIAL_USER_DETAILS_EXTRA,
  MATRIMONIAL_USER_DETAILS_IMPLICIT,
  getMatrimonialUserDetailsRequired,
  getFieldLabel,
  getFieldTab,
  getProfileRequirementsResponse,
};
