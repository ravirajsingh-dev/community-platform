import { createSlice } from "@reduxjs/toolkit";
import * as Constants from "../constants/index";

const initialState = {
  usersList: {
    page: 1,
    data: [],
    count: 0,
  },
  currentUser: [],
  loadingUsersList: true,
  loadingUser: false,
  loadingUserDetails: false,
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

const userSlice = createSlice({
  name: "adminUsers",
  initialState: initialState,
  reducers: {
    userCreated(state) {
      state.loadingUser = false;
    },
    resetUser(state) {
      return {
        ...initialState,
      };
    },
    userUpdated(state, action) {
      const updatedUser = action.payload;
      return {
        ...state,
        currentUser:
          updatedUser?._id != null ? updatedUser : state.currentUser,
        loadingUser: false,
        loadingUserDetails: false,
      };
    },
    userError(state, action) {
      return {
        ...state,
        error: action.payload,
        loadingUser: false,
        loadingUserDetails: false,
        loadingUsersList: false,
      };
    },
    userDeleted(state, action) {
      const currentCount = state.usersList.count;
      const currentLimit = state.sortingParams.limit;
      const currentPage = parseInt(state.usersList.page);
      const remainingPages = Math.ceil((currentCount - 1) / currentLimit);
      return {
        ...state,
        usersList: {
          data: state.usersList.data.filter(
            (user) => user._id !== action.payload
          ),
          count: currentCount - 1,
          page:
            currentPage <= remainingPages
              ? currentPage.toString()
              : remainingPages.toString(),
        },
        sortingParams: initialState.sortingParams,
        loadingUsersList: false,
      };
    },
    userDetailsById(state, action) {
      return {
        ...state,
        currentUser: action.payload,
        loadingUser: false,
        loadingUserDetails: false,
      };
    },
    userListUpdated(state, action) {
      return {
        ...state,
        usersList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingUsersList: false,
      };
    },

    userSearchParameterUpdate(state, action) {
      return {
        ...state,
        sortingParams: { ...action.payload },
        loadingUsersList: false,
      };
    },
    loadingOnUserSubmit(state) {
      return {
        ...state,
        loadingUser: true,
      };
    },
    loadingUserDetailsStart(state) {
      return {
        ...state,
        loadingUserDetails: true,
      };
    },
    loadingUsersList(state) {
      return {
        ...state,
        loadingUsersList: true,
      };
    },
  },
});

export const {
  userCreated,
  resetUser,
  userUpdated,
  userError,
  userDeleted,
  userDetailsById,
  userListUpdated,
  userSearchParameterUpdate,
  loadingOnUserSubmit,
  loadingUserDetailsStart,
  loadingUsersList,
} = userSlice.actions;
export default userSlice.reducer;
