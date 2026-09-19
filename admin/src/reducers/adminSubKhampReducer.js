import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  subKhampList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentSubKhamp: null,
  loadingSubKhampList: false,
  loadingSubKhamp: false,
};

const subKhampSlice = createSlice({
  name: "adminSubKhamp",
  initialState: initialState,
  reducers: {
    subKhampCreated(state) {
      state.loadingSubKhampList = false;
      state.loadingSubKhamp = false;
    },
    resetSubKhamp() {
      return initialState;
    },
    subKhampUpdated(state) {
      state.loadingSubKhampList = false;
      state.loadingSubKhamp = false;
    },
    subKhampDeleted(state, action) {
      const currentCount = state.subKhampList.count;
      const currentLimit = Constants.DEFAULT_PAGE_SIZE;
      const currentPage = parseInt(state.subKhampList.page, 10);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      state.subKhampList.data = state.subKhampList.data.filter(
        (subKhamp) => subKhamp._id !== action.payload,
      );
      state.subKhampList.count = currentCount - 1;
      state.subKhampList.page =
        currentPage <= remainingPages
          ? currentPage.toString()
          : remainingPages.toString();
      state.loadingSubKhampList = false;
    },
    subKhampListUpdated(state, action) {
      state.subKhampList = {
        data: action.payload.data,
        page: action.payload.metadata[0].current_page,
        count: action.payload.metadata[0].totalRecord,
      };
      state.loadingSubKhampList = false;
    },
    subKhampDetailsById(state, action) {
      state.currentSubKhamp = action.payload;
      state.loadingSubKhamp = false;
    },
    finishSubKhampLoading(state) {
      state.loadingSubKhampList = false;
      state.loadingSubKhamp = false;
    },
    loadingOnSubKhampSubmit(state) {
      state.loadingSubKhampList = true;
      state.loadingSubKhamp = true;
    },
    loadingSubKhampList(state) {
      state.loadingSubKhampList = true;
    },
    loadingSubKhamp(state) {
      state.loadingSubKhamp = true;
    },
  },
});

export const {
  subKhampCreated,
  resetSubKhamp,
  subKhampUpdated,
  subKhampDeleted,
  subKhampListUpdated,
  subKhampDetailsById,
  finishSubKhampLoading,
  loadingOnSubKhampSubmit,
  loadingSubKhampList,
  loadingSubKhamp,
} = subKhampSlice.actions;
export default subKhampSlice.reducer;
