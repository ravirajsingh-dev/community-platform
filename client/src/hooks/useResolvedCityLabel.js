import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  INDIA_COUNTRY_ID,
  getCityOptionFromCache,
} from "@src/utils/locationData";
import { fetchStates, fetchCities } from "@src/actions/locationActions";

/**
 * Resolve a stored cityId + stateCode to a human-readable city name
 * using the react-country-state-city location cache.
 */
export function useResolvedCityLabel(cityId, stateCode) {
  const dispatch = useDispatch();
  const locationDropdown = useSelector((state) => state.locationDropdown);
  const statesCache = locationDropdown.states[INDIA_COUNTRY_ID] || [];

  useEffect(() => {
    dispatch(fetchStates());
  }, [dispatch]);

  useEffect(() => {
    if (stateCode && statesCache.length > 0) {
      dispatch(fetchCities({ value: stateCode }));
    }
  }, [dispatch, stateCode, statesCache.length]);

  return useMemo(() => {
    if (!cityId) return "";
    const option = getCityOptionFromCache(
      cityId,
      stateCode ? { value: stateCode } : null,
      locationDropdown,
    );
    return option?.label || String(cityId);
  }, [cityId, stateCode, locationDropdown]);
}
