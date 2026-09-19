export const TAB_KEYS = {
  core: "core",
  additional: "additional",
  community: "community",
  location: "location",
  membership: "membership",
  wallet: "wallet",
  password: "password",
};

export const TAB_LABELS = {
  [TAB_KEYS.core]: "Core Information",
  [TAB_KEYS.additional]: "Additional Details",
  [TAB_KEYS.community]: "Community Details",
  [TAB_KEYS.location]: "Location Details",
  [TAB_KEYS.membership]: "Membership",
  [TAB_KEYS.wallet]: "Wallet",
  [TAB_KEYS.password]: "Change Password",
};

export const CORE_FIELDS = ["name", "email", "alternatePhone"];

export const ADDITIONAL_FIELDS = [
  "dob",
  "gender",
  "fatherName",
  "motherName",
  "height",
  "weight",
  "maritalStatus",
  "education",
  "occupation",
  "occupationDepartment",
  "occupationPosition",
  "occupationLocation",
  "occupationBusinessName",
  "occupationBusinessType",
  "bloodGroup",
];

export const ADDITIONAL_REQUIRED_FIELDS = [
  "dob",
  "gender",
  "fatherName",
  "motherName",
  "maritalStatus",
];

/** Required community chain (full hierarchy including Gotra). */
export const COMMUNITY_FIELDS = [
  "community",
  "vansh",
  "kul",
  "gotra",
  "khamp",
  "subKhamp",
];
export const COMMUNITY_OPTIONAL_FIELDS = [];

export const LOCATION_FIELDS = [
  "stateCode",
  "cityId",
  "villageId",
  "address",
];

export const LOCATION_REQUIRED_FIELDS = ["stateCode", "cityId", "address"];

export const OCCUPATION_KEY_TO_FORM = {
  department: "occupationDepartment",
  position: "occupationPosition",
  location: "occupationLocation",
  businessName: "occupationBusinessName",
  businessType: "occupationBusinessType",
};
