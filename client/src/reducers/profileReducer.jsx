import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
  profile: null,
  error: null,
  success: false,
  requirements: null,
  requirementsLoading: false,
  requirementsError: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    PROFILE_REQUEST(state) {
      return {
        ...state,
        loading: true,
        error: null,
        success: false,
      };
    },
    PROFILE_SUCCESS(state, action) {
      return {
        ...state,
        loading: false,
        profile: action.payload,
        error: null,
        success: true,
      };
    },
    PROFILE_FAIL(state, action) {
      return {
        ...state,
        loading: false,
        error: action.payload,
        success: false,
      };
    },
    PROFILE_UPDATE_SUCCESS(state, action) {
      return {
        ...state,
        loading: false,
        profile: action.payload,
        error: null,
        success: true,
      };
    },
    PROFILE_RESET(state) {
      return {
        ...initialState,
      };
    },
    PROFILE_REQUIREMENTS_REQUEST(state) {
      return {
        ...state,
        requirementsLoading: true,
        requirementsError: null,
      };
    },
    PROFILE_REQUIREMENTS_SUCCESS(state, action) {
      return {
        ...state,
        requirementsLoading: false,
        requirements: action.payload,
        requirementsError: null,
      };
    },
    PROFILE_REQUIREMENTS_FAIL(state, action) {
      return {
        ...state,
        requirementsLoading: false,
        requirementsError: action.payload,
      };
    },
  },
});

export const {
  PROFILE_REQUEST,
  PROFILE_SUCCESS,
  PROFILE_FAIL,
  PROFILE_UPDATE_SUCCESS,
  PROFILE_RESET,
  PROFILE_REQUIREMENTS_REQUEST,
  PROFILE_REQUIREMENTS_SUCCESS,
  PROFILE_REQUIREMENTS_FAIL,
} = profileSlice.actions;

export default profileSlice.reducer;
