import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  newsList: {
    page: 1,
    data: [],
    count: 0,
    nextOrder: 1,
  },
  currentNews: null,
  newsSettings: {
    title: "",
    description: "",
  },
  loadingNewsList: true,
  loadingNews: false,
  loadingNewsSettings: true,
  savingNewsSettings: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "displayOrder",
    ascending: "asc",
    query: "",
  },
};

const newsSlice = createSlice({
  name: "adminNews",
  initialState: initialState,
  reducers: {
    newsCreated(state) {
      state.loadingNewsList = false;
    },
    resetNews(state) {
      return {
        ...initialState,
      };
    },
    newsUpdated(state) {
      return {
        ...state,
        sortingParams: initialState.sortingParams,
        loadingNewsList: false,
      };
    },
    newsError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingNewsList: false,
        loadingNews: false,
        savingNewsSettings: false,
      };
    },
    newsDeleted(state, action) {
      const currentCount = state.newsList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.newsList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        newsList: {
          data: state.newsList.data.filter(
            (news) => news._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
          nextOrder: state.newsList.nextOrder,
        },
        sortingParams: initialState.sortingParams,
        loadingNewsList: false,
      };
    },
    newsListUpdated(state, action) {
      return {
        ...state,
        newsList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
          nextOrder: action.payload.metadata[0].nextOrder || 1,
        },
        loadingNewsList: false,
      };
    },
    newsDetailsById(state, action) {
      return {
        ...state,
        currentNews: action.payload,
        loadingNews: false,
      };
    },
    newsSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingNewsList: false,
      };
    },
    loadingOnNewsSubmit(state) {
      return {
        ...state,
        loadingNewsList: true,
      };
    },
    loadingNewsList(state) {
      return {
        ...state,
        loadingNewsList: true,
      };
    },
    loadingNews(state) {
      return {
        ...state,
        loadingNews: true,
      };
    },
    newsSettingsLoaded(state, action) {
      return {
        ...state,
        newsSettings: action.payload,
        loadingNewsSettings: false,
      };
    },
    loadingNewsSettings(state) {
      return {
        ...state,
        loadingNewsSettings: true,
      };
    },
    savingNewsSettings(state) {
      return {
        ...state,
        savingNewsSettings: true,
      };
    },
    newsSettingsSaved(state, action) {
      return {
        ...state,
        newsSettings: action.payload,
        savingNewsSettings: false,
      };
    },
  },
});

export const {
  newsCreated,
  resetNews,
  newsUpdated,
  newsError,
  newsDeleted,
  newsListUpdated,
  newsDetailsById,
  newsSearchParameterUpdate,
  loadingOnNewsSubmit,
  loadingNewsList,
  loadingNews,
  newsSettingsLoaded,
  loadingNewsSettings,
  savingNewsSettings,
  newsSettingsSaved,
} = newsSlice.actions;
export default newsSlice.reducer;
