import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  notificationsList: {
    page: 1,
    data: [],
    count: 0,
  },
  unreadNotificationsList: {
    count: 0,
    data: [],
  },
  currentNotification: null,
  loadingNotificationsList: true,
  loadingNotification: false,
  error: {},
  sortingParams: {
    limit: Constants.DEFAULT_PAGE_SIZE,
    page: 1,
    orderBy: "createdAt",
    ascending: "desc",
    query: "",
    isAll: 1,
  },
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState: initialState,
  reducers: {
    loadingNotificationsList(state) {
      return {
        ...state,
        loadingNotificationsList: true,
      };
    },

    notificationsListUpdated(state, action) {
      return {
        ...state,
        notificationsList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingNotificationsList: false,
      };
    },

    unreadNotificationsListUpdated(state, action) {
      return {
        ...state,
        unreadNotificationsList: {
          count: action.payload.metadata[0]?.totalRecord,
          data: action.payload.data,
        },
        loadingNotificationsList: false,
      };
    },

    resetAppToken(state) {
      return {
        ...initialState,
      };
    },

    notificationError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingNotification: false,
        loadingNotificationsList: false,
      };
    },
    loadingOnNotificationSubmit(state) {
      return {
        ...state,
        loadingNotification: true,
      };
    },

    notificationUpdated(state, action) {
      return {
        ...state,
        notificationsList: {
          ...state.notificationsList,
          data: state.notificationsList.data.map((notification) =>
            notification._id === action.payload._id
              ? action.payload
              : notification
          ),
        },
      };
    },
    loadCurrentNotification(state, action) {
      return {
        ...state,
        currentNotification: action.payload,
        loadingNotification: false,
      };
    },
    notificationDeleted(state, action) {
      const currentCount = state.notificationsList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.notificationsList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        notificationsList: {
          data: state.notificationsList.data.filter(
            (record) => record._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingNotificationsList: false,
      };
    },
  },
});

export const {
  loadingNotificationsList,
  notificationsListUpdated,
  unreadNotificationsListUpdated,
  notificationError,
  resetAppToken,
  loadingOnNotificationSubmit,
  loadCurrentNotification,
  notificationUpdated,
  notificationDeleted,
} = notificationSlice.actions;
export default notificationSlice.reducer;
