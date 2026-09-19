import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  vanshList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentVansh: null,
  loadingVanshList: false,
  loadingVansh: false,
};

const vanshSlice = createSlice({
  name: "adminVansh",
  initialState: initialState,
  reducers: {
    vanshCreated(state) {
      state.loadingVanshList = false;
      state.loadingVansh = false;
    },
    resetVansh() {
      return initialState;
    },
    vanshUpdated(state) {
      state.loadingVanshList = false;
      state.loadingVansh = false;
    },
    vanshDeleted(state, action) {
      const currentCount = state.vanshList.count;
      const currentLimit = Constants.DEFAULT_PAGE_SIZE;
      const currentPage = parseInt(state.vanshList.page, 10);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      state.vanshList.data = state.vanshList.data.filter(
        (vansh) => vansh._id !== action.payload,
      );
      state.vanshList.count = currentCount - 1;
      state.vanshList.page =
        currentPage <= remainingPages
          ? currentPage.toString()
          : remainingPages.toString();
      state.loadingVanshList = false;
    },
    vanshListUpdated(state, action) {
      state.vanshList = {
        data: action.payload.data,
        page: action.payload.metadata[0].current_page,
        count: action.payload.metadata[0].totalRecord,
      };
      state.loadingVanshList = false;
    },
    vanshDetailsById(state, action) {
      state.currentVansh = action.payload;
      state.loadingVansh = false;
    },
    finishVanshLoading(state) {
      state.loadingVanshList = false;
      state.loadingVansh = false;
    },
    loadingOnVanshSubmit(state) {
      state.loadingVanshList = true;
      state.loadingVansh = true;
    },
    loadingVanshList(state) {
      state.loadingVanshList = true;
    },
    loadingVansh(state) {
      state.loadingVansh = true;
    },
  },
});

export const {
  vanshCreated,
  resetVansh,
  vanshUpdated,
  vanshDeleted,
  vanshListUpdated,
  vanshDetailsById,
  finishVanshLoading,
  loadingOnVanshSubmit,
  loadingVanshList,
  loadingVansh,
} = vanshSlice.actions;
export default vanshSlice.reducer;
