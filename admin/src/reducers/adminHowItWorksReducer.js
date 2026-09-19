import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  howItWorksSettings: {
    title: "",
    description: "",
    steps: [],
  },
  loadingHowItWorksSettings: true,
  savingHowItWorksSettings: false,
  error: {},
};

const howItWorksSlice = createSlice({
  name: "adminHowItWorks",
  initialState,
  reducers: {
    resetHowItWorks() {
      return { ...initialState };
    },
    howItWorksError(state, action) {
      return {
        ...state,
        error: action.payload || {},
        loadingHowItWorksSettings: false,
        savingHowItWorksSettings: false,
      };
    },
    howItWorksSettingsLoaded(state, action) {
      return {
        ...state,
        howItWorksSettings: action.payload,
        loadingHowItWorksSettings: false,
      };
    },
    loadingHowItWorksSettings(state) {
      return {
        ...state,
        loadingHowItWorksSettings: true,
      };
    },
    savingHowItWorksSettings(state) {
      return {
        ...state,
        savingHowItWorksSettings: true,
      };
    },
    howItWorksSettingsSaved(state, action) {
      return {
        ...state,
        howItWorksSettings: action.payload,
        savingHowItWorksSettings: false,
      };
    },
  },
});

export const {
  resetHowItWorks,
  howItWorksError,
  howItWorksSettingsLoaded,
  loadingHowItWorksSettings,
  savingHowItWorksSettings,
  howItWorksSettingsSaved,
} = howItWorksSlice.actions;

export default howItWorksSlice.reducer;
