export const TAB_KEYS = {
  core: "core",
  additional: "additional",
  community: "community",
  location: "location",
  membership: "membership",
};

export const TAB_LABELS = {
  [TAB_KEYS.core]: "Core Information",
  [TAB_KEYS.additional]: "Additional Details",
  [TAB_KEYS.community]: "Community Details",
  [TAB_KEYS.location]: "Location Details",
  [TAB_KEYS.membership]: "Membership",
};

export const MEMBERSHIP_FIELDS = [
  "membershipPlanId",
  "isPaid",
  "isLifetimePaid",
  "renewalDate",
  "subscriptionStartDate",
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

export const LOCATION_REQUIRED_FIELDS = ["stateCode", "cityId", "address"];

export const LOCATION_FIELDS = ["stateCode", "cityId", "villageId", "address"];

export const CORE_FIELDS = [
  "name",
  "phone",
  "email",
  "status",
  "alternatePhone",
  "password",
];

export const CORE_REQUIRED_FIELDS = ["name", "phone", "email", "status"];

/** Server-aligned lengths for client validation (User + UserDetails schemas). */
export const FIELD_CONSTRAINTS = {
  name: { minLength: 3, maxLength: 50 },
  fatherName: { minLength: 3, maxLength: 100 },
  motherName: { minLength: 3, maxLength: 100 },
  address: { minLength: 5, maxLength: 300 },
  password: { minLength: 6, maxLength: 128 },
};

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

export const OCCUPATION_DETAIL_KEYS = [
  "occupationDepartment",
  "occupationPosition",
  "occupationLocation",
  "occupationBusinessName",
  "occupationBusinessType",
];

export const OCCUPATION_KEY_TO_FORM = {
  department: "occupationDepartment",
  position: "occupationPosition",
  location: "occupationLocation",
  businessName: "occupationBusinessName",
  businessType: "occupationBusinessType",
};
