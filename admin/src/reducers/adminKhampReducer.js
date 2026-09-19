import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  khampList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentKhamp: null,
  loadingKhampList: false,
  loadingKhamp: false,
};

const khampSlice = createSlice({
  name: "adminKhamp",
  initialState: initialState,
  reducers: {
    khampCreated(state) {
      state.loadingKhampList = false;
      state.loadingKhamp = false;
    },
    resetKhamp() {
      return initialState;
    },
    khampUpdated(state) {
      state.loadingKhampList = false;
      state.loadingKhamp = false;
    },
    khampDeleted(state, action) {
      const currentCount = state.khampList.count;
      const currentLimit = Constants.DEFAULT_PAGE_SIZE;
      const currentPage = parseInt(state.khampList.page, 10);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      state.khampList.data = state.khampList.data.filter(
        (khamp) => khamp._id !== action.payload,
      );
      state.khampList.count = currentCount - 1;
      state.khampList.page =
        currentPage <= remainingPages
          ? currentPage.toString()
          : remainingPages.toString();
      state.loadingKhampList = false;
    },
    khampListUpdated(state, action) {
      state.khampList = {
        data: action.payload.data,
        page: action.payload.metadata[0].current_page,
        count: action.payload.metadata[0].totalRecord,
      };
      state.loadingKhampList = false;
    },
    khampDetailsById(state, action) {
      state.currentKhamp = action.payload;
      state.loadingKhamp = false;
    },
    finishKhampLoading(state) {
      state.loadingKhampList = false;
      state.loadingKhamp = false;
    },
    loadingOnKhampSubmit(state) {
      state.loadingKhampList = true;
      state.loadingKhamp = true;
    },
    loadingKhampList(state) {
      state.loadingKhampList = true;
    },
    loadingKhamp(state) {
      state.loadingKhamp = true;
    },
  },
});

export const {
  khampCreated,
  resetKhamp,
  khampUpdated,
  khampDeleted,
  khampListUpdated,
  khampDetailsById,
  finishKhampLoading,
  loadingOnKhampSubmit,
  loadingKhampList,
  loadingKhamp,
} = khampSlice.actions;
export default khampSlice.reducer;
