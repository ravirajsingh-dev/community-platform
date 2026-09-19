import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  sliderList: {
    page: 1,
    data: [],
    count: 0,
    nextOrder: 1,
  },
  heroSettings: {
    title: "",
    tagline: "",
    buttons: [],
  },
  loadingSliderList: true,
  loadingHeroSettings: true,
  savingHeroSettings: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "order",
    ascending: "asc",
    query: "",
  },
};

const sliderSlice = createSlice({
  name: "adminSlider",
  initialState: initialState,
  reducers: {
    sliderCreated(state) {
      state.loadingSliderList = false;
    },
    resetSlider(state) {
      return {
        ...initialState,
      };
    },
    sliderUpdated(state, action) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingSliderList: false,
      };
    },
    sliderError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingSliderList: false,
        loadingHeroSettings: false,
        savingHeroSettings: false,
      };
    },
    sliderDeleted(state, action) {
      const currentCount = state.sliderList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.sliderList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        sliderList: {
          data: state.sliderList.data.filter(
            (slider) => slider._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingSliderList: false,
      };
    },
    sliderListUpdated(state, action) {
      return {
        ...state,
        sliderList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
          nextOrder: action.payload.metadata[0].nextOrder || 1,
        },
        loadingSliderList: false,
      };
    },
    heroSettingsUpdated(state, action) {
      return {
        ...state,
        heroSettings: action.payload,
        loadingHeroSettings: false,
        savingHeroSettings: false,
      };
    },
    loadingHeroSettings(state) {
      return {
        ...state,
        loadingHeroSettings: true,
      };
    },
    savingHeroSettings(state) {
      return {
        ...state,
        savingHeroSettings: true,
      };
    },
    sliderSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingSliderList: false,
      };
    },
    loadingOnSliderSubmit(state) {
      return {
        ...state,
        loadingSliderList: true,
      };
    },
    loadingSliderList(state) {
      return {
        ...state,
        loadingSliderList: true,
      };
    },
  },
});

export const {
  sliderCreated,
  resetSlider,
  sliderUpdated,
  sliderError,
  sliderDeleted,
  sliderListUpdated,
  sliderSearchParameterUpdate,
  loadingOnSliderSubmit,
  loadingSliderList,
  heroSettingsUpdated,
  loadingHeroSettings,
  savingHeroSettings,
} = sliderSlice.actions;
export default sliderSlice.reducer;

