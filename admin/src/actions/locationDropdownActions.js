import api from "@src/utils/axiosSetup";
import {
  setStates,
  setCities,
  setVillages,
  loadingStates,
  loadingCities,
  loadingVillages,
} from "@reducers/locationDropdownReducer";
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

const parseDropdownList = (res) => {
  if (
    res.data?.status === true &&
    res.data.response &&
    res.data.response[0]
  ) {
    return res.data.response[0].data || [];
  }
  return [];
};

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
    dispatch(setCities({ cacheKey, data: [] }));
    return { data: [] };
  }
};

export const seedVillageOption =
  (cityId, villageId, label) => (dispatch, getState) => {
    if (!cityId || !villageId) return;

    const cacheKey = String(cityId);
    const value = String(villageId._id || villageId);
    const existing = getState().locationDropdown.villages[cacheKey] || [];

    if (existing.some((item) => item.value === value)) return;

    dispatch(
      setVillages({
        cityId: cacheKey,
        data: [...existing, { value, label: label || value }],
      }),
    );
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
    if (state.locationDropdown.villageListsLoaded[cacheKey]) {
      return { data: state.locationDropdown.villages[cacheKey] };
    }

    dispatch(loadingVillages(cacheKey));
    try {
      const params = new URLSearchParams({
        limit: "100",
        page: "1",
        activeOnly: "true",
        countryCode: query.countryCode,
        stateCode: query.stateCode,
        cityId: query.cityId,
      });
      const res = await api.get(`/api/admin/villages?${params.toString()}`);
      const villages = parseDropdownList(res);
      const formatted = villages.map((v) => ({
        value: v._id.toString(),
        label: v.name,
      }));
      dispatch(setVillages({ cityId: cacheKey, data: formatted, listLoaded: true }));
      return { data: formatted };
    } catch (err) {
      dispatch(setVillages({ cityId: cacheKey, data: [], listLoaded: false }));
      return { data: [] };
    }
  };
