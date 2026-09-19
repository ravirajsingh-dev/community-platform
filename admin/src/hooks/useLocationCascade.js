import { useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  INDIA_COUNTRY_OPTION,
  getLocationDropdownCacheKeys,
  resolveStateId,
} from "@src/utils/locationData";
import {
  fetchStates,
  fetchCities,
  fetchVillages,
} from "@src/actions/locationDropdownActions";

const toOption = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  return { value };
};

/**
 * India-fixed location cascade: State → City → Village (admin village API).
 */
export function useLocationCascade({
  stateCode = null,
  cityId = null,
  prefetchStates = true,
  fetchVillagesEnabled = true,
} = {}) {
  const dispatch = useDispatch();
  const locationDropdown = useSelector((state) => state.locationDropdown);

  const stateOption = useMemo(() => toOption(stateCode), [stateCode]);
  const cityOption = useMemo(() => toOption(cityId), [cityId]);

  const countryId = INDIA_COUNTRY_OPTION.meta.countryId;
  const stateOptions = locationDropdown.states[countryId] || [];
  const resolvedStateId = resolveStateId(stateOption, stateOptions);
  const { citiesKey } = getLocationDropdownCacheKeys(
    INDIA_COUNTRY_OPTION,
    stateOption,
    stateOptions,
  );
  const cityOptions = citiesKey ? locationDropdown.cities[citiesKey] || [] : [];
  const villageCacheKey = cityOption?.value ? String(cityOption.value) : null;
  const villageOptions = villageCacheKey
    ? locationDropdown.villages[villageCacheKey] || []
    : [];

  const loadingStates = locationDropdown.loadingStates[countryId] || false;
  const loadingCities = citiesKey
    ? locationDropdown.loadingCities[citiesKey] || false
    : false;
  const loadingVillages = villageCacheKey
    ? locationDropdown.loadingVillages[villageCacheKey] || false
    : false;

  useEffect(() => {
    if (prefetchStates) {
      dispatch(fetchStates());
    }
  }, [dispatch, prefetchStates]);

  useEffect(() => {
    if (resolvedStateId) {
      dispatch(fetchCities(stateOption));
    }
  }, [dispatch, stateOption, resolvedStateId]);

  useEffect(() => {
    if (fetchVillagesEnabled && cityOption?.value) {
      dispatch(fetchVillages(cityOption));
    }
  }, [dispatch, fetchVillagesEnabled, cityOption?.value]);

  const loadStates = useCallback(() => dispatch(fetchStates()), [dispatch]);

  const loadCities = useCallback(() => {
    if (!stateOption?.value) return Promise.resolve({ data: [] });
    return dispatch(fetchCities(stateOption));
  }, [dispatch, stateOption]);

  const loadVillages = useCallback(() => {
    if (!cityOption?.value) return Promise.resolve({ data: [] });
    return dispatch(fetchVillages(cityOption));
  }, [dispatch, cityOption]);

  const applyLocationSelectChange = useCallback((field, selectedOption, prev) => {
    const next = { ...prev, [field]: selectedOption };
    if (field === "stateCode") {
      next.cityId = null;
      next.villageId = null;
    } else if (field === "cityId") {
      next.villageId = null;
    }
    return next;
  }, []);

  return {
    india: INDIA_COUNTRY_OPTION,
    countryId,
    citiesKey,
    stateOptions,
    cityOptions,
    villageOptions,
    loadingStates,
    loadingCities,
    loadingVillages,
    loadStates,
    loadCities,
    loadVillages,
    applyLocationSelectChange,
  };
}
