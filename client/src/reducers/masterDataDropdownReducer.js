import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  communities: [],
  vanshes: {},
  kuls: {},
  khamps: {},
  subKhamps: {},
  gotras: {},
  creatableLevels: [
    "community",
    "vansh",
    "kul",
    "khamp",
    "subKhamp",
    "gotra",
  ],
  creatableLevelsLoaded: false,
  loadingCreatableLevels: false,
  loadingCommunities: false,
  loadingVanshes: {},
  loadingKuls: {},
  loadingKhamps: {},
  loadingSubKhamps: {},
  loadingGotras: {},
};

const masterDataDropdownSlice = createSlice({
  name: "masterDataDropdown",
  initialState: initialState,
  reducers: {
    setCommunities(state, action) {
      state.communities = action.payload;
      state.loadingCommunities = false;
    },
    setVanshes(state, action) {
      const { communityId, data } = action.payload;
      state.vanshes[communityId] = data;
      state.loadingVanshes[communityId] = false;
    },
    setKuls(state, action) {
      const { vanshId, data } = action.payload;
      state.kuls[vanshId] = data;
      state.loadingKuls[vanshId] = false;
    },
    setKhamps(state, action) {
      const { kulId, data } = action.payload;
      state.khamps[kulId] = data;
      state.loadingKhamps[kulId] = false;
    },
    setSubKhamps(state, action) {
      const { khampId, data } = action.payload;
      state.subKhamps[khampId] = data;
      state.loadingSubKhamps[khampId] = false;
    },
    setGotras(state, action) {
      const { kulId, data } = action.payload;
      state.gotras[kulId] = data;
      state.loadingGotras[kulId] = false;
    },
    loadingCommunities(state) {
      state.loadingCommunities = true;
    },
    loadingVanshes(state, action) {
      state.loadingVanshes[action.payload] = true;
    },
    loadingKuls(state, action) {
      state.loadingKuls[action.payload] = true;
    },
    loadingKhamps(state, action) {
      state.loadingKhamps[action.payload] = true;
    },
    loadingSubKhamps(state, action) {
      state.loadingSubKhamps[action.payload] = true;
    },
    loadingGotras(state, action) {
      state.loadingGotras[action.payload] = true;
    },
    loadingCreatableLevels(state) {
      state.loadingCreatableLevels = true;
    },
    setCreatableLevels(state, action) {
      state.creatableLevels = action.payload;
      state.creatableLevelsLoaded = true;
      state.loadingCreatableLevels = false;
    },
  },
});

export const {
  setCommunities,
  setVanshes,
  setKuls,
  setKhamps,
  setSubKhamps,
  setGotras,
  loadingCommunities,
  loadingVanshes,
  loadingKuls,
  loadingKhamps,
  loadingSubKhamps,
  loadingGotras,
  loadingCreatableLevels,
  setCreatableLevels,
} = masterDataDropdownSlice.actions;
export default masterDataDropdownSlice.reducer;
