import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  states: {},
  cities: {},
  villages: {},
  villageListsLoaded: {},
  loadingStates: {},
  loadingCities: {},
  loadingVillages: {},
};

const locationDropdownSlice = createSlice({
  name: "locationDropdown",
  initialState: initialState,
  reducers: {
    setStates(state, action) {
      const { countryId, data } = action.payload;
      state.states[countryId] = data;
      state.loadingStates[countryId] = false;
    },
    setCities(state, action) {
      const { cacheKey, data } = action.payload;
      state.cities[cacheKey] = data;
      state.loadingCities[cacheKey] = false;
    },
    setVillages(state, action) {
      const { cityId, data, listLoaded } = action.payload;
      state.villages[cityId] = data;
      if (listLoaded) {
        state.villageListsLoaded[cityId] = true;
      }
      state.loadingVillages[cityId] = false;
    },
    loadingStates(state, action) {
      state.loadingStates[action.payload] = true;
    },
    loadingCities(state, action) {
      state.loadingCities[action.payload] = true;
    },
    loadingVillages(state, action) {
      state.loadingVillages[action.payload] = true;
    },
    resetLocationDropdown(state) {
      return initialState;
    },
  },
});

export const {
  setStates,
  setCities,
  setVillages,
  loadingStates,
  loadingCities,
  loadingVillages,
  resetLocationDropdown,
} = locationDropdownSlice.actions;
export default locationDropdownSlice.reducer;
