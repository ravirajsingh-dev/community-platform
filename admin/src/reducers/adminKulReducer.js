import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  kulList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentKul: null,
  loadingKulList: false,
  loadingKul: false,
};

const kulSlice = createSlice({
  name: "adminKul",
  initialState: initialState,
  reducers: {
    kulCreated(state) {
      state.loadingKulList = false;
      state.loadingKul = false;
    },
    resetKul() {
      return initialState;
    },
    kulUpdated(state) {
      state.loadingKulList = false;
      state.loadingKul = false;
    },
    kulDeleted(state, action) {
      const currentCount = state.kulList.count;
      const currentLimit = Constants.DEFAULT_PAGE_SIZE;
      const currentPage = parseInt(state.kulList.page, 10);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      state.kulList.data = state.kulList.data.filter(
        (kul) => kul._id !== action.payload,
      );
      state.kulList.count = currentCount - 1;
      state.kulList.page =
        currentPage <= remainingPages
          ? currentPage.toString()
          : remainingPages.toString();
      state.loadingKulList = false;
    },
    kulListUpdated(state, action) {
      state.kulList = {
        data: action.payload.data,
        page: action.payload.metadata[0].current_page,
        count: action.payload.metadata[0].totalRecord,
      };
      state.loadingKulList = false;
    },
    kulDetailsById(state, action) {
      state.currentKul = action.payload;
      state.loadingKul = false;
    },
    finishKulLoading(state) {
      state.loadingKulList = false;
      state.loadingKul = false;
    },
    loadingOnKulSubmit(state) {
      state.loadingKulList = true;
      state.loadingKul = true;
    },
    loadingKulList(state) {
      state.loadingKulList = true;
    },
    loadingKul(state) {
      state.loadingKul = true;
    },
  },
});

export const {
  kulCreated,
  resetKul,
  kulUpdated,
  kulDeleted,
  kulListUpdated,
  kulDetailsById,
  finishKulLoading,
  loadingOnKulSubmit,
  loadingKulList,
  loadingKul,
} = kulSlice.actions;
export default kulSlice.reducer;
