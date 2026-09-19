import { validateForm } from "@src/utils/validation";
import { isValidEmail } from "@src/utils/inputValidation";
import {
  OccupationFieldConfig,
  EducationOptions,
  MAX_EDUCATIONS,
  toEducationArray,
} from "@src/constants/CustomSelectValues";
import { INDIA_ISO2 } from "@src/utils/locationData";
import {
  TAB_KEYS,
  ADDITIONAL_REQUIRED_FIELDS,
  COMMUNITY_FIELDS,
  COMMUNITY_OPTIONAL_FIELDS,
  LOCATION_REQUIRED_FIELDS,
  LOCATION_FIELDS,
  CORE_FIELDS,
  ADDITIONAL_FIELDS,
  MEMBERSHIP_FIELDS,
  OCCUPATION_DETAIL_KEYS,
  OCCUPATION_KEY_TO_FORM,
  FIELD_CONSTRAINTS,
} from "./editUserConstants";

const minLengthRule = (path, minLength, label) => ({
  path,
  msg: `${label} must be at least ${minLength} characters`,
  validator: (value) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return true;
    return trimmed.length >= minLength;
  },
});

const maxLengthRule = (path, maxLength, label) => ({
  path,
  msg: `${label} must be at most ${maxLength} characters`,
  validator: (value) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return true;
    return trimmed.length <= maxLength;
  },
});

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

export const isFieldEqual = (current, original) => {
  if (current === original) return true;
  if (Array.isArray(current) || Array.isArray(original)) {
    const a = toEducationArray(current);
    const b = toEducationArray(original);
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }
  if (isSelectValue(current) || isSelectValue(original)) {
    return (current?.value ?? null) === (original?.value ?? null);
  }
  return String(current ?? "") === String(original ?? "");
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

const getTabFields = (tabKey) => {
  switch (tabKey) {
    case TAB_KEYS.core:
      return CORE_FIELDS;
    case TAB_KEYS.additional:
      return ADDITIONAL_FIELDS;
    case TAB_KEYS.community:
      return COMMUNITY_FIELDS;
    case TAB_KEYS.location:
      return LOCATION_FIELDS;
    case TAB_KEYS.membership:
      return MEMBERSHIP_FIELDS;
    default:
      return [];
  }
};

export const isSectionEdited = (tabKey, formData, originalSnapshot) => {
  if (!originalSnapshot) return false;
  return getTabFields(tabKey).some(
    (field) => !isFieldEqual(formData[field], originalSnapshot[field]),
  );
};

export const getSectionFilled = (tabKey, originalSnapshot) => {
  switch (tabKey) {
    case TAB_KEYS.core:
      return true;
    case TAB_KEYS.additional:
      return hasAdditionalDetails(originalSnapshot);
    case TAB_KEYS.community:
      return hasCommunityDetails(originalSnapshot);
    case TAB_KEYS.location:
      return hasLocationDetails(originalSnapshot);
    case TAB_KEYS.membership:
      return true;
    default:
      return false;
  }
};

const getCannotBlankErrors = (tabKey, formData, originalSnapshot) => {
  const errors = [];
  getTabFields(tabKey).forEach((field) => {
    // education is optional multi-select; clearing to [] is allowed
    if (field === "education") return;
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

export const getValidationRulesForTab = (
  tabKey,
  { formData, originalSnapshot, showPasswordField },
) => {
  const sectionFilled = getSectionFilled(tabKey, originalSnapshot);
  const sectionEdited = isSectionEdited(tabKey, formData, originalSnapshot);

  if (!sectionFilled && !sectionEdited) {
    return [];
  }

  const rules = [];

  if (tabKey === TAB_KEYS.core) {
    const { name, password: passwordLimits } = FIELD_CONSTRAINTS;
    rules.push(
      { path: "name", msg: "Name is required" },
      minLengthRule("name", name.minLength, "Name"),
      maxLengthRule("name", name.maxLength, "Name"),
      { path: "phone", msg: "Phone is required" },
      {
        path: "phone",
        msg: "Phone must be exactly 10 digits",
        validator: (value) => /^\d{10}$/.test(String(value).trim()),
      },
      { path: "status", msg: "Status is required" },
      {
        path: "email",
        msg: "Email is required",
      },
      {
        path: "email",
        msg: "Please enter a valid email address",
        validator: (value) => isValidEmail(value),
      },
      {
        path: "alternatePhone",
        msg: "Alternate phone must be exactly 10 digits",
        validator: (value) => {
          if (!value) return true;
          return /^\d{10}$/.test(String(value).trim());
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
    if (showPasswordField) {
      rules.push(
        {
          path: "password",
          msg: "Password is required when changing password",
        },
        minLengthRule(
          "password",
          passwordLimits.minLength,
          "Password",
        ),
        maxLengthRule(
          "password",
          passwordLimits.maxLength,
          "Password",
        ),
      );
    }
    return rules;
  }

  if (tabKey === TAB_KEYS.additional) {
    const { fatherName, motherName } = FIELD_CONSTRAINTS;
    rules.push(
      { path: "dob", msg: "Date of birth is required" },
      { path: "gender", msg: "Gender is required" },
      { path: "fatherName", msg: "Father's name is required" },
      minLengthRule("fatherName", fatherName.minLength, "Father's name"),
      maxLengthRule("fatherName", fatherName.maxLength, "Father's name"),
      { path: "motherName", msg: "Mother's name is required" },
      minLengthRule("motherName", motherName.minLength, "Mother's name"),
      maxLengthRule("motherName", motherName.maxLength, "Mother's name"),
      { path: "maritalStatus", msg: "Marital status is required" },
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
    );
    return rules;
  }

  if (tabKey === TAB_KEYS.community) {
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
    return rules;
  }

  if (tabKey === TAB_KEYS.location) {
    const { address } = FIELD_CONSTRAINTS;
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
      { path: "address", msg: "Address is required" },
      minLengthRule("address", address.minLength, "Address"),
      maxLengthRule("address", address.maxLength, "Address"),
    );
    return rules;
  }

  return rules;
};

export const validateTab = (
  tabKey,
  { formData, originalSnapshot, showPasswordField },
) => {
  const sectionFilled = getSectionFilled(tabKey, originalSnapshot);
  const sectionEdited = isSectionEdited(tabKey, formData, originalSnapshot);

  if (!sectionFilled && !sectionEdited) {
    return { valid: false, noChanges: true, errors: [] };
  }

  const rules = getValidationRulesForTab(tabKey, {
    formData,
    originalSnapshot,
    showPasswordField,
  });

  const errors = [
    ...validateForm(formData, rules),
    ...getCannotBlankErrors(tabKey, formData, originalSnapshot),
  ];

  return { valid: errors.length === 0, noChanges: false, errors };
};

export const buildSubmitDataForTab = (
  tabKey,
  formData,
  { showPasswordField },
) => {
  const submitData = {};
  const locationFieldKeys = ["stateCode", "cityId"];

  const includeField = (key) => {
    if (key === "password" && !showPasswordField) return;
    if (OCCUPATION_DETAIL_KEYS.includes(key)) return;
    if (locationFieldKeys.includes(key)) return;

    if (
      key === "villageId" ||
      COMMUNITY_FIELDS.includes(key) ||
      COMMUNITY_OPTIONAL_FIELDS.includes(key)
    ) {
      if (formData[key] && formData[key].value) {
        submitData[key] = formData[key].value;
      } else if (COMMUNITY_OPTIONAL_FIELDS.includes(key)) {
        submitData[key] = null;
      }
      return;
    }

    if (
      formData[key] !== "" &&
      formData[key] !== null &&
      formData[key] !== undefined
    ) {
      submitData[key] = formData[key];
    }
  };

  if (tabKey === TAB_KEYS.core) {
    CORE_FIELDS.forEach((key) => {
      includeField(key);
    });
    return submitData;
  }

  if (tabKey === TAB_KEYS.additional) {
    ADDITIONAL_FIELDS.forEach((key) => {
      if (key === "education") {
        submitData.education = toEducationArray(formData.education);
        return;
      }
      includeField(key);
    });
    if (formData.occupation) {
      submitData.occupation = formData.occupation;
      const fields = OccupationFieldConfig[formData.occupation] || [];
      if (fields.length > 0) {
        const occupationDetails = {};
        fields.forEach((f) => {
          const v = formData[OCCUPATION_KEY_TO_FORM[f.key]];
          if (v != null && String(v).trim() !== "") {
            occupationDetails[f.key] = String(v).trim();
          }
        });
        if (Object.keys(occupationDetails).length > 0) {
          submitData.occupationDetails = occupationDetails;
        }
      }
    }
    return submitData;
  }

  if (tabKey === TAB_KEYS.community) {
    COMMUNITY_FIELDS.forEach(includeField);
    COMMUNITY_OPTIONAL_FIELDS.forEach(includeField);
    return submitData;
  }

  if (tabKey === TAB_KEYS.location) {
    submitData.countryCode = INDIA_ISO2;
    submitData.stateCode = formData.stateCode?.value;
    submitData.cityId = formData.cityId?.value;
    submitData.villageId = formData.villageId?.value ?? null;
    if (formData.address != null && String(formData.address).trim() !== "") {
      submitData.address = String(formData.address).trim();
    }
    return submitData;
  }

  if (tabKey === TAB_KEYS.membership) {
    submitData.isPaid = Boolean(formData.isPaid);
    submitData.isLifetimePaid = Boolean(formData.isLifetimePaid);
    submitData.renewalDate = formData.renewalDate || null;
    submitData.subscriptionStartDate = formData.subscriptionStartDate || null;
    submitData.membershipPlanId = formData.membershipPlanId?.value || null;
    return submitData;
  }

  return submitData;
};
