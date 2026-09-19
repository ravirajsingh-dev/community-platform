import { GetState, GetCity } from "react-country-state-city";

export const INDIA_ISO2 = "IN";
export const INDIA_COUNTRY_ID = 101;

export const INDIA_COUNTRY_OPTION = {
  value: INDIA_ISO2,
  label: "India",
  status: "active",
  meta: { countryId: INDIA_COUNTRY_ID },
  isDefault: true,
};

export const buildCityCacheKey = (countryId, stateId) =>
  `${countryId}-${stateId}`;

export const getStateOptions = async (countryId = INDIA_COUNTRY_ID) => {
  if (!countryId) return [];
  const states = await GetState(countryId);
  return (states || []).map((s) => ({
    value: s.state_code,
    label: s.name,
    status: "active",
    meta: { stateId: s.id, countryId },
  }));
};

export const getCityOptions = async (countryId, stateId) => {
  if (!countryId || !stateId) return [];
  const cities = await GetCity(countryId, stateId);
  return (cities || []).map((c) => ({
    value: String(c.id),
    label: c.name,
    status: "active",
    meta: {
      cityId: c.id,
      cityName: c.name,
      countryId,
      stateId,
    },
  }));
};

export const resolveStateId = (input, states = []) => {
  if (input == null || input === "") return null;
  if (typeof input === "number") return input;
  if (typeof input === "string" && /^\d+$/.test(input)) return Number(input);

  if (typeof input === "object") {
    if (input.meta?.stateId != null) return input.meta.stateId;
    if (input.value) {
      const fromCache = states.find((s) => s.value === input.value);
      if (fromCache?.meta?.stateId != null) return fromCache.meta.stateId;
    }
  }

  return null;
};

export const resolveVillageQuery = (input) => {
  if (!input || typeof input !== "object") return null;

  const cityId = input.meta?.cityId ?? input.value;
  const countryCode = input.meta?.countryCode || INDIA_ISO2;
  const stateCode = input.meta?.stateCode;
  const cityName = input.meta?.cityName ?? input.label;

  if (!cityId || !stateCode) return null;

  return {
    cityId: String(cityId),
    countryCode,
    stateCode,
    ...(cityName ? { cityName: String(cityName) } : {}),
  };
};

export const attachLocationMetaToCity = (
  cityOption,
  countryOption = INDIA_COUNTRY_OPTION,
  stateOption,
) => {
  if (!cityOption || typeof cityOption !== "object") return cityOption;
  return {
    ...cityOption,
    meta: {
      ...cityOption.meta,
      countryCode: countryOption?.value ?? INDIA_ISO2,
      stateCode: stateOption?.value,
      countryId: countryOption?.meta?.countryId ?? INDIA_COUNTRY_ID,
      stateId: stateOption?.meta?.stateId ?? cityOption.meta?.stateId,
    },
  };
};

export const getLocationDropdownCacheKeys = (
  countryOption = INDIA_COUNTRY_OPTION,
  stateOption,
  statesCache = null,
) => {
  const countryId = countryOption?.meta?.countryId ?? INDIA_COUNTRY_ID;
  let stateId = stateOption?.meta?.stateId ?? null;
  if (!stateId && stateOption && statesCache?.length) {
    stateId = resolveStateId(stateOption, statesCache);
  }
  const citiesKey =
    countryId && stateId ? buildCityCacheKey(countryId, stateId) : null;
  return { countryId, stateId, citiesKey };
};

export const getCityOptionFromCache = (
  cityId,
  stateInput,
  locationDropdown,
  countryOption = INDIA_COUNTRY_OPTION,
) => {
  if (!cityId || !locationDropdown) return null;
  const countryId = countryOption?.meta?.countryId ?? INDIA_COUNTRY_ID;
  const statesCache = locationDropdown.states?.[countryId] || [];
  const { citiesKey } = getLocationDropdownCacheKeys(
    countryOption,
    stateInput,
    statesCache,
  );
  if (!citiesKey) return null;
  return (locationDropdown.cities[citiesKey] || []).find(
    (c) => c.value === String(cityId),
  );
};

export const findStateOptionInCaches = (stateInput, statesMap) => {
  const code =
    typeof stateInput === "object" && stateInput !== null
      ? stateInput.value
      : stateInput;
  if (!code) return null;

  for (const states of Object.values(statesMap)) {
    const found = (states || []).find((s) => s.value === code);
    if (found) return found;
  }
  return null;
};

export const getLabelFromOptions = (id, options) => {
  if (!id || !options || !Array.isArray(options)) return null;
  const idStr = id.toString();
  const option = options.find((opt) => opt.value === idStr);
  return option ? option.label : null;
};
