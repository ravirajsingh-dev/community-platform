import { validateForm } from "@src/utils/validation";
import { EducationOptions, MAX_EDUCATIONS, toEducationArray } from "@src/constants/educationConstants";
import {
  TAB_KEYS,
  ADDITIONAL_REQUIRED_FIELDS,
  COMMUNITY_FIELDS,
  LOCATION_REQUIRED_FIELDS,
} from "./myAccountConstants";
import { isFieldEqual, isSectionEdited } from "./myAccountUtils";

const isSelectValue = (value) =>
  value &&
  typeof value === "object" &&
  value.value != null &&
  value.value !== "";

const isEmptyValue = (value) => {
  if (value == null || value === "") return true;
  if (typeof value === "object" && "value" in value) return !value.value;
  return false;
};

export const hasAdditionalDetails = (snapshot) =>
  ADDITIONAL_REQUIRED_FIELDS.every((field) => !isEmptyValue(snapshot?.[field]));

export const hasCommunityDetails = (snapshot) =>
  COMMUNITY_FIELDS.every((field) => isSelectValue(snapshot?.[field]));

export const hasLocationDetails = (snapshot) =>
  LOCATION_REQUIRED_FIELDS.every((field) => {
    if (field === "stateCode" || field === "cityId") {
      return isSelectValue(snapshot?.[field]);
    }
    return !isEmptyValue(snapshot?.[field]);
  });

const getSectionFilled = (tabKey, originalSnapshot) => {
  switch (tabKey) {
    case TAB_KEYS.core:
      return true;
    case TAB_KEYS.additional:
      return hasAdditionalDetails(originalSnapshot);
    case TAB_KEYS.community:
      return hasCommunityDetails(originalSnapshot);
    case TAB_KEYS.location:
      return hasLocationDetails(originalSnapshot);
    default:
      return false;
  }
};

const getCannotBlankErrors = (tabKey, formData, originalSnapshot) => {
  const fieldsByTab = {
    [TAB_KEYS.core]: ["name", "email"],
    [TAB_KEYS.additional]: ADDITIONAL_REQUIRED_FIELDS,
    [TAB_KEYS.community]: COMMUNITY_FIELDS,
    [TAB_KEYS.location]: LOCATION_REQUIRED_FIELDS,
  };
  const errors = [];
  (fieldsByTab[tabKey] || []).forEach((field) => {
    const original = originalSnapshot?.[field];
    const current = formData[field];
    if (!isEmptyValue(original) && isEmptyValue(current)) {
      const label = field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());
      errors.push({
        path: field,
        msg: `${label.trim()} cannot be cleared once set`,
      });
    }
  });
  return errors;
};

const getValidationRulesForTab = (
  tabKey,
  { formData, originalSnapshot, communityDetailsLocked, locationDetailsLocked },
) => {
  const sectionFilled = getSectionFilled(tabKey, originalSnapshot);
  const sectionEdited = isSectionEdited(tabKey, formData, originalSnapshot);

  if (!sectionFilled && !sectionEdited) {
    return [];
  }

  const rules = [];

  if (tabKey === TAB_KEYS.core) {
    rules.push(
      {
        path: "name",
        msg: "Name is required",
        validator: (value) => value && value.trim().length >= 3,
      },
      {
        path: "email",
        msg: "Email is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "email",
        msg: "Invalid email format",
        validator: (value) => !value || /\S+@\S+\.\S+/.test(value),
      },
      {
        path: "alternatePhone",
        msg: "Alternate phone must be exactly 10 digits",
        validator: (value) => {
          if (!value) return true;
          const phoneStr = String(value).trim();
          return phoneStr.length === 10 && /^\d{10}$/.test(phoneStr);
        },
      },
      {
        path: "alternatePhone",
        msg: "Alternate phone must be different from main phone",
        validator: (value) => {
          if (!value) return true;
          return value !== formData.phone;
        },
      },
    );
  }

  if (tabKey === TAB_KEYS.additional) {
    rules.push(
      {
        path: "dob",
        msg: "Date of birth is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "dob",
        msg: "Date of birth cannot be in the future",
        validator: (value) => {
          if (!value) return false;
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selectedDate <= today;
        },
      },
      {
        path: "dob",
        msg: "Minimum age must be 3 years",
        validator: (value) => {
          if (!value) return false;
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const minDate = new Date(today);
          minDate.setFullYear(today.getFullYear() - 3);
          return selectedDate <= minDate;
        },
      },
      {
        path: "gender",
        msg: "Gender is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "gender",
        msg: "Gender must be one of: male, female, other",
        validator: (value) => {
          if (!value) return true;
          return ["male", "female", "other"].includes(value);
        },
      },
      {
        path: "fatherName",
        msg: "Father's name is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "fatherName",
        msg: "Father's name must be at least 3 characters",
        validator: (value) => {
          if (!value) return true;
          return value.trim().length >= 3;
        },
      },
      {
        path: "fatherName",
        msg: "Father's name must be at most 100 characters",
        validator: (value) => {
          if (!value) return true;
          return value.trim().length <= 100;
        },
      },
      {
        path: "motherName",
        msg: "Mother's name is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "motherName",
        msg: "Mother's name must be at least 3 characters",
        validator: (value) => {
          if (!value) return true;
          return value.trim().length >= 3;
        },
      },
      {
        path: "motherName",
        msg: "Mother's name must be at most 100 characters",
        validator: (value) => {
          if (!value) return true;
          return value.trim().length <= 100;
        },
      },
      {
        path: "height",
        msg: "Height must be between 0 and 300",
        validator: (value) => {
          if (value === "" || value == null) return true;
          const n = Number(value);
          return !Number.isNaN(n) && n >= 0 && n <= 300;
        },
      },
      {
        path: "weight",
        msg: "Weight must be between 0 and 500",
        validator: (value) => {
          if (value === "" || value == null) return true;
          const n = Number(value);
          return !Number.isNaN(n) && n >= 0 && n <= 500;
        },
      },
      {
        path: "maritalStatus",
        msg: "Marital status is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "maritalStatus",
        msg: "Marital status must be one of: single, married, remarried, divorced, widowed, separated",
        validator: (value) => {
          if (!value) return true;
          return [
            "single",
            "married",
            "remarried",
            "divorced",
            "widowed",
            "separated",
          ].includes(value);
        },
      },
      {
        path: "education",
        msg: `You can select at most ${MAX_EDUCATIONS} education values`,
        validator: (value) => toEducationArray(value).length <= MAX_EDUCATIONS,
      },
      {
        path: "education",
        msg: "Each education must be one of the allowed options",
        validator: (value) => {
          const list = toEducationArray(value);
          if (list.length === 0) return true;
          return list.every((item) =>
            EducationOptions.some((o) => o.value === item),
          );
        },
      },
      {
        path: "education",
        msg: "Duplicate education values are not allowed",
        validator: (value) => {
          const list = toEducationArray(value);
          return new Set(list).size === list.length;
        },
      },
      {
        path: "occupation",
        msg: "Occupation must be one of: Student, Government Job, Private Job, Business",
        validator: (value) => {
          if (!value) return true;
          return [
            "Student",
            "Government Job",
            "Private Job",
            "Business",
          ].includes(value.trim());
        },
      },
      {
        path: "bloodGroup",
        msg: "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-",
        validator: (value) => {
          if (!value) return true;
          return ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(
            value,
          );
        },
      },
    );
  }

  if (tabKey === TAB_KEYS.community && !communityDetailsLocked) {
    rules.push(
      {
        path: "community",
        msg: "Community is required",
        validator: (value) => value && value.value,
      },
      {
        path: "vansh",
        msg: "Vansh is required",
        validator: (value) => value && value.value,
      },
      {
        path: "kul",
        msg: "Kul is required",
        validator: (value) => value && value.value,
      },
      {
        path: "khamp",
        msg: "Khamp is required",
        validator: (value) => value && value.value,
      },
      {
        path: "subKhamp",
        msg: "Sub-Khamp is required",
        validator: (value) => value && value.value,
      },
      {
        path: "gotra",
        msg: "Gotra is required",
        validator: (value) => value && value.value,
      },
    );
  }

  if (tabKey === TAB_KEYS.location && !locationDetailsLocked) {
    rules.push(
      {
        path: "stateCode",
        msg: "State is required",
        validator: (value) => value && value.value,
      },
      {
        path: "cityId",
        msg: "City is required",
        validator: (value) => value && value.value,
      },
      {
        path: "address",
        msg: "Address is required",
        validator: (value) => value && value.trim().length > 0,
      },
      {
        path: "address",
        msg: "Address must be at least 5 characters",
        validator: (value) => {
          if (!value) return true;
          return value.trim().length >= 5;
        },
      },
      {
        path: "address",
        msg: "Address must be at most 300 characters",
        validator: (value) => {
          if (!value) return true;
          return value.trim().length <= 300;
        },
      },
    );
  }

  return rules;
};

export const validateTab = (
  tabKey,
  { formData, originalSnapshot, communityDetailsLocked, locationDetailsLocked },
) => {
  if (!originalSnapshot) {
    return { valid: false, errors: [], noChanges: true };
  }

  if (!isSectionEdited(tabKey, formData, originalSnapshot)) {
    return { valid: true, errors: [], noChanges: true };
  }

  const rules = getValidationRulesForTab(tabKey, {
    formData,
    originalSnapshot,
    communityDetailsLocked,
    locationDetailsLocked,
  });

  const errors = [
    ...validateForm(formData, rules),
    ...getCannotBlankErrors(tabKey, formData, originalSnapshot),
  ];

  return {
    valid: errors.length === 0,
    errors,
    noChanges: false,
  };
};

export const getChangedFieldsForTab = (tabKey, formData, originalSnapshot) => {
  if (!originalSnapshot) return [];
  const fieldsByTab = {
    [TAB_KEYS.core]: ["name", "email", "alternatePhone"],
    [TAB_KEYS.additional]: [
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
    ],
    [TAB_KEYS.community]: COMMUNITY_FIELDS,
    [TAB_KEYS.location]: LOCATION_FIELDS,
  };

  return (fieldsByTab[tabKey] || []).filter(
    (field) => !isFieldEqual(formData[field], originalSnapshot[field]),
  );
};
