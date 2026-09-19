import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  communities: [],
  vanshes: {},
  kuls: {},
  khamps: {},
  subKhamps: {},
  gotras: {},
  communitiesListLoaded: false,
  vanshListsLoaded: {},
  kulListsLoaded: {},
  khampListsLoaded: {},
  subKhampListsLoaded: {},
  gotraListsLoaded: {},
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
      state.communities = action.payload.data ?? action.payload;
      if (action.payload.listLoaded) {
        state.communitiesListLoaded = true;
      }
      state.loadingCommunities = false;
    },
    setVanshes(state, action) {
      const { communityId, data, listLoaded } = action.payload;
      state.vanshes[communityId] = data;
      if (listLoaded) {
        state.vanshListsLoaded[communityId] = true;
      }
      state.loadingVanshes[communityId] = false;
    },
    setKuls(state, action) {
      const { vanshId, data, listLoaded } = action.payload;
      state.kuls[vanshId] = data;
      if (listLoaded) {
        state.kulListsLoaded[vanshId] = true;
      }
      state.loadingKuls[vanshId] = false;
    },
    setKhamps(state, action) {
      const { kulId, data, listLoaded } = action.payload;
      state.khamps[kulId] = data;
      if (listLoaded) {
        state.khampListsLoaded[kulId] = true;
      }
      state.loadingKhamps[kulId] = false;
    },
    setSubKhamps(state, action) {
      const { khampId, data, listLoaded } = action.payload;
      state.subKhamps[khampId] = data;
      if (listLoaded) {
        state.subKhampListsLoaded[khampId] = true;
      }
      state.loadingSubKhamps[khampId] = false;
    },
    setGotras(state, action) {
      const { kulId, data, listLoaded } = action.payload;
      state.gotras[kulId] = data;
      if (listLoaded) {
        state.gotraListsLoaded[kulId] = true;
      }
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
    resetMasterDataDropdown(state) {
      return initialState;
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
  resetMasterDataDropdown,
} = masterDataDropdownSlice.actions;
export default masterDataDropdownSlice.reducer;
