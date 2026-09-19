import api from "@src/utils/axiosSetup";
import {
  setStates,
  setCities,
  setVillages,
  loadingStates,
  loadingCities,
  loadingVillages,
} from "@src/reducers/locationDropdownReducer";
import { setAlert } from "./alert";
import {
  getStateOptions,
  getCityOptions,
  buildCityCacheKey,
  resolveStateId,
  resolveVillageQuery,
  attachLocationMetaToCity,
  findStateOptionInCaches,
  INDIA_COUNTRY_ID,
  INDIA_COUNTRY_OPTION,
  INDIA_ISO2,
} from "@src/utils/locationData";

export const fetchStates = () => async (dispatch, getState) => {
  const countryId = INDIA_COUNTRY_ID;
  const state = getState();

  if (state.locationDropdown.loadingStates[countryId]) {
    return { data: state.locationDropdown.states[countryId] || [] };
  }
  if (state.locationDropdown.states[countryId]) {
    return { data: state.locationDropdown.states[countryId] };
  }

  dispatch(loadingStates(countryId));
  try {
    const formatted = await getStateOptions(countryId);
    dispatch(setStates({ countryId, data: formatted }));
    return { data: formatted };
  } catch (err) {
    console.error("Error fetching states:", err);
    dispatch(setStates({ countryId, data: [] }));
    return { data: [] };
  }
};

export const fetchCities = (stateInput) => async (dispatch, getState) => {
  const countryId = INDIA_COUNTRY_ID;
  const state = getState();
  const statesCache = state.locationDropdown.states[countryId] || [];

  let stateId = resolveStateId(stateInput, statesCache);
  let stateOption = stateId
    ? statesCache.find((s) => s.meta?.stateId === stateId) || null
    : null;

  if (!stateId) {
    stateOption = findStateOptionInCaches(
      stateInput,
      state.locationDropdown.states,
    );
    stateId = stateOption?.meta?.stateId ?? null;
  }

  if (!stateId) return { data: [] };

  const cacheKey = buildCityCacheKey(countryId, stateId);

  if (state.locationDropdown.loadingCities[cacheKey]) {
    return { data: state.locationDropdown.cities[cacheKey] || [] };
  }
  if (state.locationDropdown.cities[cacheKey]) {
    return { data: state.locationDropdown.cities[cacheKey] };
  }

  dispatch(loadingCities(cacheKey));
  try {
    const formatted = (await getCityOptions(countryId, stateId)).map((opt) =>
      attachLocationMetaToCity(opt, INDIA_COUNTRY_OPTION, stateOption),
    );
    dispatch(setCities({ cacheKey, data: formatted }));
    return { data: formatted };
  } catch (err) {
    console.error("Error fetching cities:", err);
    dispatch(setCities({ cacheKey, data: [] }));
    return { data: [] };
  }
};

export const fetchVillages =
  (cityInput, locationContext = {}) => async (dispatch, getState) => {
    let query = resolveVillageQuery(cityInput);
    if (!query && locationContext?.cityId && locationContext?.stateCode) {
      query = {
        cityId: String(locationContext.cityId),
        countryCode: locationContext.countryCode || INDIA_ISO2,
        stateCode: locationContext.stateCode,
      };
    }

    if (!query?.cityId || !query?.countryCode || !query?.stateCode) {
      return { data: [] };
    }

    const cacheKey = query.cityId;
    const state = getState();

    if (state.locationDropdown.loadingVillages[cacheKey]) {
      return { data: state.locationDropdown.villages[cacheKey] || [] };
    }
    if (state.locationDropdown.villages[cacheKey]) {
      return { data: state.locationDropdown.villages[cacheKey] };
    }

    dispatch(loadingVillages(cacheKey));
    try {
      const params = new URLSearchParams({
        countryCode: query.countryCode,
        stateCode: query.stateCode,
        cityId: query.cityId,
      });
      const res = await api.get(
        `/api/users/location/villages?${params.toString()}`,
      );
      const formatted =
        res.data?.status === true && Array.isArray(res.data.response)
          ? res.data.response
          : [];
      dispatch(setVillages({ cityId: cacheKey, data: formatted }));
      return { data: formatted };
    } catch (err) {
      console.error("Error fetching villages:", err);
      dispatch(setVillages({ cityId: cacheKey, data: [] }));
      return { data: [] };
    }
  };

export const createVillage = (citySelection, name) => async (dispatch) => {
  const query = resolveVillageQuery(citySelection);
  if (!query?.countryCode || !query?.stateCode || !query?.cityId) {
    dispatch(setAlert("Please select state and city first", "danger"));
    return null;
  }

  try {
    const response = await api.post("/api/users/location/villages", {
      countryCode: query.countryCode,
      stateCode: query.stateCode,
      cityId: query.cityId,
      ...(query.cityName ? { cityName: query.cityName } : {}),
      name,
    });
    if (response.data?.status === true) {
      dispatch(setVillages({ cityId: query.cityId, data: [] }));
      dispatch(setAlert("Village created successfully", "success"));
      return response.data;
    }
    dispatch(
      setAlert(response.data?.message || "Failed to create village", "danger"),
    );
    return null;
  } catch (error) {
    console.error("Error creating village:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create village",
        "danger",
      ),
    );
    return null;
  }
};
