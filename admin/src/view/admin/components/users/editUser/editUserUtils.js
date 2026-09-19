import {
  INDIA_COUNTRY_OPTION,
  INDIA_ISO2,
  INDIA_COUNTRY_ID,
  getLocationDropdownCacheKeys,
  getLabelFromOptions,
  getCityOptionFromCache,
} from "@src/utils/locationData";
import { toEducationArray } from "@src/constants/CustomSelectValues";

export const toRefId = (ref) => (ref ? String(ref._id || ref) : null);

/** Maps CustomSelect option to a synthetic change event for form state. */
export const formSelectFieldChange =
  (name, onChange, { stringify = false } = {}) =>
  (option) => {
    const raw = option?.value;
    const value =
      raw == null || raw === "" ? "" : stringify ? String(raw) : raw;
    onChange({ target: { name, value } });
  };

/** Maps multi CustomSelect options → string[] synthetic change event. */
export const formMultiSelectFieldChange =
  (name, onChange) => (options) => {
    const list = Array.isArray(options) ? options : [];
    const value = list
      .map((option) => option?.value)
      .filter((v) => v != null && v !== "")
      .map((v) => String(v));
    onChange({ target: { name, value } });
  };

export const toSelectOption = (
  id,
  { label, cache, fallbackLabel = "Loading..." } = {},
) => {
  if (!id) return null;
  const resolvedLabel =
    label || (cache ? getLabelFromOptions(id, cache) : null) || fallbackLabel;
  return { value: id, label: resolvedLabel };
};

export const INITIAL_FORM_DATA = {
  name: "",
  phone: "",
  email: "",
  password: "",
  status: "",
  alternatePhone: "",
  referralId: "",
  dob: "",
  gender: "",
  fatherName: "",
  motherName: "",
  height: "",
  weight: "",
  address: "",
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
  membershipPlanId: null,
  isPaid: false,
  isLifetimePaid: false,
  renewalDate: "",
  subscriptionStartDate: "",
};

export const buildFormDataFromUser = (
  user,
  { masterDataDropdown, locationDropdown },
) => {
  const userDetails = user.userDetails || {};

  const stateCodeValue = userDetails.stateCode || null;
  const cityIdValue = userDetails.cityId ? String(userDetails.cityId) : null;
  const villageIdValue = toRefId(userDetails.villageId);
  // Registration / wallet may store community only on User
  const communityValue = toRefId(userDetails.community || user.community);
  const vanshValue = toRefId(userDetails.vansh);
  const kulValue = toRefId(userDetails.kul);
  const khampValue = toRefId(userDetails.khamp);
  const subKhampValue = toRefId(userDetails.subKhamp);
  const gotraValue = toRefId(userDetails.gotra);

  const statesCache = locationDropdown.states[INDIA_COUNTRY_ID] || [];
  const stateInput = stateCodeValue ? { value: stateCodeValue } : null;
  const { citiesKey } = getLocationDropdownCacheKeys(
    INDIA_COUNTRY_OPTION,
    stateInput,
    statesCache,
  );
  const citiesCache = citiesKey ? locationDropdown.cities[citiesKey] || [] : [];
  const matchedState = stateCodeValue
    ? statesCache.find((s) => s.value === stateCodeValue)
    : null;
  const matchedCity = cityIdValue
    ? getCityOptionFromCache(cityIdValue, stateInput, locationDropdown)
    : null;
  const cityLabel = cityIdValue
    ? getLabelFromOptions(cityIdValue, citiesCache) || cityIdValue
    : null;

  return {
    name: user.name || "",
    phone: user.phone || "",
    email: user.email || "",
    status:
      user.status !== undefined && user.status !== null
        ? String(user.status)
        : "",
    alternatePhone: user.alternatePhone || "",
    referralId: user.referralId || "",
    dob: userDetails.dob
      ? new Date(userDetails.dob).toISOString().split("T")[0]
      : "",
    gender: userDetails.gender || "",
    fatherName: userDetails.fatherName || "",
    motherName: userDetails.motherName || "",
    height:
      userDetails.height != null && userDetails.height !== ""
        ? String(userDetails.height)
        : "",
    weight:
      userDetails.weight != null && userDetails.weight !== ""
        ? String(userDetails.weight)
        : "",
    address: userDetails.address || "",
    stateCode: stateCodeValue
      ? matchedState ||
        toSelectOption(stateCodeValue, {
          cache: statesCache,
          fallbackLabel: stateCodeValue,
        })
      : null,
    cityId: cityIdValue
      ? matchedCity || {
          value: cityIdValue,
          label: cityLabel,
          meta: {
            cityId: userDetails.cityId,
            countryCode: userDetails.countryCode || INDIA_ISO2,
            stateCode: userDetails.stateCode,
            ...(cityLabel ? { cityName: cityLabel } : {}),
          },
        }
      : null,
    villageId: toSelectOption(villageIdValue, {
      label: userDetails.villageLabel,
      cache: cityIdValue ? locationDropdown.villages[cityIdValue] || [] : [],
    }),
    community: toSelectOption(communityValue, {
      label: userDetails.communityLabel || user.communityLabel,
      cache: masterDataDropdown.communities,
    }),
    vansh: toSelectOption(vanshValue, {
      label: userDetails.vanshLabel,
      cache: masterDataDropdown.vanshes[communityValue] || [],
    }),
    kul: toSelectOption(kulValue, {
      label: userDetails.kulLabel,
      cache: masterDataDropdown.kuls[vanshValue] || [],
    }),
    khamp: toSelectOption(khampValue, {
      label: userDetails.khampLabel,
      cache: masterDataDropdown.khamps[kulValue] || [],
    }),
    subKhamp: toSelectOption(subKhampValue, {
      label: userDetails.subKhampLabel,
      cache: masterDataDropdown.subKhamps[khampValue] || [],
    }),
    gotra: toSelectOption(gotraValue, {
      label: userDetails.gotraLabel,
      cache: masterDataDropdown.gotras[kulValue] || [],
    }),
    maritalStatus: userDetails.maritalStatus || "",
    education: toEducationArray(userDetails.education),
    occupation: userDetails.occupation || "",
    occupationDepartment: userDetails.occupationDetails?.department ?? "",
    occupationPosition: userDetails.occupationDetails?.position ?? "",
    occupationLocation: userDetails.occupationDetails?.location ?? "",
    occupationBusinessName: userDetails.occupationDetails?.businessName ?? "",
    occupationBusinessType: userDetails.occupationDetails?.businessType ?? "",
    bloodGroup: userDetails.bloodGroup || "",
    password: "",
    membershipPlanId: (() => {
      const planId = toRefId(user.membershipPlanId);
      if (!planId) return null;
      const planName =
        user.membershipPlan?.name ||
        user.membershipPlanName ||
        null;
      const planPrice =
        user.membershipPlan?.price ?? user.membershipPlanPrice ?? null;
      const label = planName
        ? planPrice != null
          ? `${planName} (₹${planPrice})`
          : planName
        : "Loading...";
      return toSelectOption(planId, { label });
    })(),
    isPaid: Boolean(user.isPaid),
    isLifetimePaid: Boolean(user.isLifetimePaid),
    renewalDate: user.renewalDate
      ? new Date(user.renewalDate).toISOString().split("T")[0]
      : "",
    subscriptionStartDate: user.subscriptionStartDate
      ? new Date(user.subscriptionStartDate).toISOString().split("T")[0]
      : "",
  };
};

export const patchLocationFields = (prev, user, dropdown) => {
  const userDetails = user?.userDetails;
  if (!userDetails?.cityId && !userDetails?.stateCode) return prev;

  const statesCache = dropdown.states[INDIA_COUNTRY_ID] || [];
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
