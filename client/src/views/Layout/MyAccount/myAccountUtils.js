import { OccupationFieldConfig } from "@src/constants/occupationConstants";
import { toEducationArray } from "@src/constants/educationConstants";
import {
  INDIA_COUNTRY_OPTION,
  INDIA_ISO2,
  INDIA_COUNTRY_ID,
  getLabelFromOptions,
  getLocationDropdownCacheKeys,
  getCityOptionFromCache,
} from "@src/utils/locationData";
import {
  TAB_KEYS,
  CORE_FIELDS,
  ADDITIONAL_FIELDS,
  COMMUNITY_FIELDS,
  COMMUNITY_OPTIONAL_FIELDS,
  LOCATION_FIELDS,
  OCCUPATION_KEY_TO_FORM,
} from "./myAccountConstants";

export const INITIAL_FORM_DATA = {
  name: "",
  memberId: "",
  phone: "",
  alternatePhone: "",
  email: "",
  referralId: "",
  dob: "",
  gender: "",
  fatherName: "",
  motherName: "",
  height: "",
  weight: "",
  address: "",
  countryCode: INDIA_COUNTRY_OPTION,
  stateCode: null,
  cityId: null,
  villageId: null,
  community: null,
  vansh: null,
  kul: null,
  khamp: null,
  subKhamp: null,
  gotra: null,
  maritalStatus: "",
  education: [],
  occupation: "",
  occupationDepartment: "",
  occupationPosition: "",
  occupationLocation: "",
  occupationBusinessName: "",
  occupationBusinessType: "",
  bloodGroup: "",
};

export const getLockFlagsFromProfile = (data) => {
  const ud = data?.userDetails || {};
  const hasCommunityDetails = !!(
    ud.community &&
    ud.vansh &&
    ud.kul &&
    ud.khamp &&
    ud.subKhamp &&
    ud.gotra
  );
  const hasLocationDetails = !!(
    ud.countryCode &&
    ud.stateCode &&
    ud.cityId &&
    ud.villageId
  );
  return {
    communityDetailsLocked: hasCommunityDetails,
    locationDetailsLocked: hasLocationDetails,
  };
};

export const buildFormDataFromProfile = (data, locationDropdown = {}) => {
  if (!data) return { ...INITIAL_FORM_DATA };

  const ud = data.userDetails || {};
  const statesCache = locationDropdown.states?.[INDIA_COUNTRY_ID] || [];
  const stateInput = ud.stateCode ? { value: ud.stateCode } : null;
  const { citiesKey } = getLocationDropdownCacheKeys(
    INDIA_COUNTRY_OPTION,
    stateInput,
    statesCache,
  );
  const cityOptionsList = citiesKey
    ? locationDropdown.cities?.[citiesKey] || []
    : [];
  const matchedState = ud.stateCode
    ? statesCache.find((s) => s.value === ud.stateCode)
    : null;
  const matchedCity = ud.cityId
    ? getCityOptionFromCache(ud.cityId, stateInput, locationDropdown)
    : null;

  return {
    name: data.name || "",
    memberId: data.memberId || "",
    phone: data.phone || "",
    alternatePhone: data.alternatePhone || "",
    email: data.email || "",
    referralId: data.referralId || "",
    dob: ud.dob ? new Date(ud.dob).toISOString().split("T")[0] : "",
    gender: ud.gender || "",
    fatherName: ud.fatherName || "",
    motherName: ud.motherName || "",
    height:
      ud.height != null && ud.height !== "" ? String(ud.height) : "",
    weight:
      ud.weight != null && ud.weight !== "" ? String(ud.weight) : "",
    address: ud.address || "",
    countryCode: INDIA_COUNTRY_OPTION,
    stateCode: ud.stateCode
      ? matchedState || {
          value: ud.stateCode,
          label:
            getLabelFromOptions(ud.stateCode, statesCache) || ud.stateCode,
          status: "active",
        }
      : null,
    cityId: ud.cityId
      ? matchedCity || {
          value: String(ud.cityId),
          label:
            getLabelFromOptions(String(ud.cityId), cityOptionsList) ||
            String(ud.cityId),
          status: "active",
          meta: {
            cityId: ud.cityId,
            countryCode: ud.countryCode || INDIA_ISO2,
            stateCode: ud.stateCode,
            ...(getLabelFromOptions(String(ud.cityId), cityOptionsList)
              ? {
                  cityName: getLabelFromOptions(
                    String(ud.cityId),
                    cityOptionsList,
                  ),
                }
              : {}),
          },
        }
      : null,
    villageId: ud.villageId
      ? {
          value: ud.villageId.toString(),
          label: ud.villageLabel || "",
          status: ud.villageStatus,
        }
      : null,
    community: ud.community
      ? {
          value: ud.community.toString(),
          label: ud.communityLabel || "",
          status: ud.communityStatus,
        }
      : null,
    vansh: ud.vansh
      ? {
          value: ud.vansh.toString(),
          label: ud.vanshLabel || "",
          status: ud.vanshStatus,
        }
      : null,
    kul: ud.kul
      ? {
          value: ud.kul.toString(),
          label: ud.kulLabel || "",
          status: ud.kulStatus,
        }
      : null,
    khamp: ud.khamp
      ? {
          value: ud.khamp.toString(),
          label: ud.khampLabel || "",
          status: ud.khampStatus,
        }
      : null,
    subKhamp: ud.subKhamp
      ? {
          value: ud.subKhamp.toString(),
          label: ud.subKhampLabel || "",
          status: ud.subKhampStatus,
        }
      : null,
    gotra: ud.gotra
      ? {
          value: ud.gotra.toString(),
          label: ud.gotraLabel || "",
          status: ud.gotraStatus,
        }
      : null,
    maritalStatus: ud.maritalStatus || "",
    education: toEducationArray(ud.education),
    occupation: ud.occupation || "",
    occupationDepartment: ud.occupationDetails?.department ?? "",
    occupationPosition: ud.occupationDetails?.position ?? "",
    occupationLocation: ud.occupationDetails?.location ?? "",
    occupationBusinessName: ud.occupationDetails?.businessName ?? "",
    occupationBusinessType: ud.occupationDetails?.businessType ?? "",
    bloodGroup: ud.bloodGroup || "",
  };
};

const getTabFields = (tabKey) => {
  switch (tabKey) {
    case TAB_KEYS.core:
      return CORE_FIELDS;
    case TAB_KEYS.additional:
      return ADDITIONAL_FIELDS;
    case TAB_KEYS.community:
      return [...COMMUNITY_FIELDS, ...COMMUNITY_OPTIONAL_FIELDS];
    case TAB_KEYS.location:
      return LOCATION_FIELDS;
    default:
      return [];
  }
};

const isSelectValue = (value) =>
  value &&
  typeof value === "object" &&
  value.value != null &&
  value.value !== "";

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

export const isSectionEdited = (tabKey, formData, originalSnapshot) => {
  if (!originalSnapshot) return false;
  return getTabFields(tabKey).some(
    (field) => !isFieldEqual(formData[field], originalSnapshot[field]),
  );
};

export const buildSubmitDataForTab = (
  tabKey,
  formData,
  { communityDetailsLocked, locationDetailsLocked },
) => {
  switch (tabKey) {
    case TAB_KEYS.core:
      return {
        name: formData.name.trim(),
        email: formData.email ? formData.email.trim() : "",
        alternatePhone: formData.alternatePhone
          ? formData.alternatePhone.trim()
          : "",
      };
    case TAB_KEYS.additional: {
      const keyToForm = OCCUPATION_KEY_TO_FORM;
      const occupationDetailsForSubmit = (() => {
        if (!formData.occupation) return {};
        const details = {};
        (OccupationFieldConfig[formData.occupation] || []).forEach((f) => {
          const formKey = keyToForm[f.key];
          const v = formData[formKey];
          if (v != null && String(v).trim() !== "") {
            details[f.key] = String(v).trim();
          }
        });
        return Object.keys(details).length > 0
          ? { occupationDetails: details }
          : {};
      })();

      return {
        dob: formData.dob || undefined,
        gender: formData.gender || undefined,
        fatherName: formData.fatherName
          ? formData.fatherName.trim()
          : undefined,
        motherName: formData.motherName
          ? formData.motherName.trim()
          : undefined,
        height:
          formData.height !== "" && formData.height != null
            ? Number(formData.height)
            : undefined,
        weight:
          formData.weight !== "" && formData.weight != null
            ? Number(formData.weight)
            : undefined,
        maritalStatus: formData.maritalStatus || undefined,
        education: toEducationArray(formData.education),
        occupation: formData.occupation
          ? formData.occupation.trim()
          : undefined,
        ...occupationDetailsForSubmit,
        bloodGroup: formData.bloodGroup
          ? formData.bloodGroup.trim()
          : undefined,
      };
    }
    case TAB_KEYS.community:
      if (communityDetailsLocked) return {};
      return {
        community: formData.community?.value || undefined,
        vansh: formData.vansh?.value || undefined,
        kul: formData.kul?.value || undefined,
        khamp: formData.khamp?.value || undefined,
        subKhamp: formData.subKhamp?.value || undefined,
        gotra: formData.gotra?.value || undefined,
      };
    case TAB_KEYS.location:
      if (locationDetailsLocked) return {};
      return {
        countryCode: INDIA_ISO2,
        stateCode: formData.stateCode?.value || undefined,
        cityId: formData.cityId?.value || undefined,
        villageId: formData.villageId?.value ?? null,
        address: formData.address ? formData.address.trim() : undefined,
      };
    default:
      return {};
  }
};

export const stripEmptyValues = (data) => {
  const next = { ...data };
  Object.keys(next).forEach((key) => {
    // Keep education [] so API can clear selections
    if (key === "education" && Array.isArray(next[key])) return;
    if (
      next[key] === "" ||
      next[key] === null ||
      next[key] === undefined
    ) {
      delete next[key];
    }
  });
  return next;
};

export const patchLocationFields = (prev, profile, dropdown) => {
  const userDetails = profile?.userDetails;
  if (!userDetails?.cityId && !userDetails?.stateCode) return prev;

  const statesCache = dropdown.states?.[INDIA_COUNTRY_ID] || [];
  const stateInput = userDetails.stateCode
    ? { value: userDetails.stateCode }
    : null;

  let next = prev;
  let changed = false;

  if (
    userDetails.stateCode &&
    prev.stateCode?.value === userDetails.stateCode &&
    prev.stateCode?.label === userDetails.stateCode
  ) {
    const matched = statesCache.find((s) => s.value === userDetails.stateCode);
    if (matched) {
      next = { ...next, stateCode: matched };
      changed = true;
    }
  }

  if (
    userDetails.cityId &&
    prev.cityId?.value === String(userDetails.cityId) &&
    prev.cityId?.label === String(userDetails.cityId)
  ) {
    const matched = getCityOptionFromCache(
      userDetails.cityId,
      stateInput,
      dropdown,
    );
    if (matched) {
      next = { ...next, cityId: matched };
      changed = true;
    }
  }

  return changed ? next : prev;
};
