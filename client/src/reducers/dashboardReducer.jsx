import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  dashboardStash: null,
  loadingDashboardStash: false,
  error: {},
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: initialState,
  reducers: {
    dashboardStashUpdated(state, action) {
      return {
        ...state,
        dashboardStash: action.payload,
        loadingDashboardStash: false,
      };
    },
    dashboardError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingDashboardStash: false,
      };
    },
    loadingDashboardStash(state) {
      return {
        ...state,
        loadingDashboardStash: true,
      };
    },
    resetDashboardStates(state) {
      return {
        ...initialState,
      };
    },
  },
});

export const {
  dashboardStashUpdated,
  dashboardError,
  loadingDashboardStash,
  resetDashboardStates,
} = dashboardSlice.actions;
export default dashboardSlice.reducer;
