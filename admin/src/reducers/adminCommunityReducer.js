import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  communityList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentCommunity: null,
  loadingCommunitiesList: false,
  loadingCommunity: false,
};

const communitySlice = createSlice({
  name: "adminCommunity",
  initialState: initialState,
  reducers: {
    communityCreated(state) {
      state.loadingCommunitiesList = false;
      state.loadingCommunity = false;
    },
    resetCommunity() {
      return initialState;
    },
    communityUpdated(state) {
      state.loadingCommunitiesList = false;
      state.loadingCommunity = false;
    },
    communityDeleted(state, action) {
      const currentCount = state.communityList.count;
      const currentLimit = Constants.DEFAULT_PAGE_SIZE;
      const currentPage = parseInt(state.communityList.page, 10);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      state.communityList.data = state.communityList.data.filter(
        (community) => community._id !== action.payload,
      );
      state.communityList.count = currentCount - 1;
      state.communityList.page =
        currentPage <= remainingPages
          ? currentPage.toString()
          : remainingPages.toString();
      state.loadingCommunitiesList = false;
    },
    communityListUpdated(state, action) {
      state.communityList = {
        data: action.payload.data,
        page: action.payload.metadata[0].current_page,
        count: action.payload.metadata[0].totalRecord,
      };
      state.loadingCommunitiesList = false;
    },
    communityDetailsById(state, action) {
      state.currentCommunity = action.payload;
      state.loadingCommunity = false;
    },
    finishCommunityLoading(state) {
      state.loadingCommunitiesList = false;
      state.loadingCommunity = false;
    },
    loadingOnCommunitySubmit(state) {
      state.loadingCommunitiesList = true;
      state.loadingCommunity = true;
    },
    loadingCommunitiesList(state) {
      state.loadingCommunitiesList = true;
    },
    loadingCommunity(state) {
      state.loadingCommunity = true;
    },
  },
});

export const {
  communityCreated,
  resetCommunity,
  communityUpdated,
  communityDeleted,
  communityListUpdated,
  communityDetailsById,
  finishCommunityLoading,
  loadingOnCommunitySubmit,
  loadingCommunitiesList,
  loadingCommunity,
} = communitySlice.actions;
export default communitySlice.reducer;
