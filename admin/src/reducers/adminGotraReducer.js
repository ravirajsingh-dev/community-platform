import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  gotraList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentGotra: null,
  loadingGotraList: false,
  loadingGotra: false,
};

const gotraSlice = createSlice({
  name: "adminGotra",
  initialState: initialState,
  reducers: {
    gotraCreated(state) {
      state.loadingGotraList = false;
      state.loadingGotra = false;
    },
    resetGotra() {
      return initialState;
    },
    gotraUpdated(state) {
      state.loadingGotraList = false;
      state.loadingGotra = false;
    },
    gotraDeleted(state, action) {
      const currentCount = state.gotraList.count;
      const currentLimit = Constants.DEFAULT_PAGE_SIZE;
      const currentPage = parseInt(state.gotraList.page, 10);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      state.gotraList.data = state.gotraList.data.filter(
        (gotra) => gotra._id !== action.payload,
      );
      state.gotraList.count = currentCount - 1;
      state.gotraList.page =
        currentPage <= remainingPages
          ? currentPage.toString()
          : remainingPages.toString();
      state.loadingGotraList = false;
    },
    gotraListUpdated(state, action) {
      state.gotraList = {
        data: action.payload.data,
        page: action.payload.metadata[0].current_page,
        count: action.payload.metadata[0].totalRecord,
      };
      state.loadingGotraList = false;
    },
    gotraDetailsById(state, action) {
      state.currentGotra = action.payload;
      state.loadingGotra = false;
    },
    finishGotraLoading(state) {
      state.loadingGotraList = false;
      state.loadingGotra = false;
    },
    loadingOnGotraSubmit(state) {
      state.loadingGotraList = true;
      state.loadingGotra = true;
    },
    loadingGotraList(state) {
      state.loadingGotraList = true;
    },
    loadingGotra(state) {
      state.loadingGotra = true;
    },
  },
});

export const {
  gotraCreated,
  resetGotra,
  gotraUpdated,
  gotraDeleted,
  gotraListUpdated,
  gotraDetailsById,
  finishGotraLoading,
  loadingOnGotraSubmit,
  loadingGotraList,
  loadingGotra,
} = gotraSlice.actions;
export default gotraSlice.reducer;
