import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  pendingList: {
    page: 1,
    data: [],
    count: 0,
  },
  loadingPendingList: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    search: "",
    level: "",
    communityId: "",
    vanshId: "",
    kulId: "",
    khampId: "",
  },
};

const hierarchyPendingSlice = createSlice({
  name: "adminHierarchyPending",
  initialState,
  reducers: {
    resetHierarchyPending(state) {
      return { ...initialState };
    },
    hierarchyPendingError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingPendingList: false,
      };
    },
    hierarchyPendingListUpdated(state, action) {
      return {
        ...state,
        pendingList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingPendingList: false,
      };
    },
    hierarchyPendingSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...state.sortingParams, ...action.payload },
      };
    },
    loadingHierarchyPendingList(state) {
      return {
        ...state,
        loadingPendingList: true,
      };
    },
  },
});

export const {
  resetHierarchyPending,
  hierarchyPendingError,
  hierarchyPendingListUpdated,
  hierarchyPendingSearchParameterUpdate,
  loadingHierarchyPendingList,
} = hierarchyPendingSlice.actions;

export default hierarchyPendingSlice.reducer;
