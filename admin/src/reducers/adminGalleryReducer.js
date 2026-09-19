import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  galleryList: {
    page: 1,
    data: [],
    count: 0,
  },
  gallerySettings: {
    title: "",
    description: "",
  },
  loadingGalleryList: true,
  loadingGallerySettings: true,
  savingGallerySettings: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
  },
};

const gallerySlice = createSlice({
  name: "adminGallery",
  initialState: initialState,
  reducers: {
    galleryImageCreated(state) {
      state.loadingGalleryList = false;
    },
    resetGallery(state) {
      return {
        ...initialState,
      };
    },
    galleryError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingGalleryList: false,
        savingGallerySettings: false,
      };
    },
    galleryDeleted(state, action) {
      const currentCount = state.galleryList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.galleryList.page, 10);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);

      return {
        ...state,
        galleryList: {
          data: state.galleryList.data.filter(
            (image) => image._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        loadingGalleryList: false,
      };
    },
    galleryBulkDeleted(state, action) {
      const deletedIds = action.payload || [];
      const deletedSet = new Set(deletedIds);
      const nextCount = Math.max(0, state.galleryList.count - deletedIds.length);

      return {
        ...state,
        galleryList: {
          ...state.galleryList,
          data: state.galleryList.data.filter(
            (image) => !deletedSet.has(image._id)
          ),
          count: nextCount,
        },
        loadingGalleryList: false,
      };
    },
    galleryListUpdated(state, action) {
      return {
        ...state,
        galleryList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingGalleryList: false,
      };
    },
    gallerySearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingGalleryList: false,
      };
    },
    loadingOnGallerySubmit(state) {
      return {
        ...state,
        loadingGalleryList: true,
      };
    },
    loadingGalleryList(state) {
      return {
        ...state,
        loadingGalleryList: true,
      };
    },
    gallerySettingsLoaded(state, action) {
      return {
        ...state,
        gallerySettings: action.payload,
        loadingGallerySettings: false,
      };
    },
    loadingGallerySettings(state) {
      return {
        ...state,
        loadingGallerySettings: true,
      };
    },
    savingGallerySettings(state) {
      return {
        ...state,
        savingGallerySettings: true,
      };
    },
    gallerySettingsSaved(state, action) {
      return {
        ...state,
        gallerySettings: action.payload,
        savingGallerySettings: false,
      };
    },
  },
});

export const {
  galleryImageCreated,
  resetGallery,
  galleryError,
  galleryDeleted,
  galleryBulkDeleted,
  galleryListUpdated,
  gallerySearchParameterUpdate,
  loadingOnGallerySubmit,
  loadingGalleryList,
  gallerySettingsLoaded,
  loadingGallerySettings,
  savingGallerySettings,
  gallerySettingsSaved,
} = gallerySlice.actions;
export default gallerySlice.reducer;
