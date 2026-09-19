import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  hierarchySettings: {
    userCreatableLevels: [],
  },
  loadingHierarchySettings: false,
  loadingOnHierarchySettingsSubmit: false,
};

const hierarchySettingsSlice = createSlice({
  name: "adminHierarchySettings",
  initialState,
  reducers: {
    loadingHierarchySettings(state) {
      state.loadingHierarchySettings = true;
    },
    hierarchySettingsUpdated(state, action) {
      state.hierarchySettings = action.payload;
      state.loadingHierarchySettings = false;
      state.loadingOnHierarchySettingsSubmit = false;
    },
    loadingOnHierarchySettingsSubmit(state) {
      state.loadingOnHierarchySettingsSubmit = true;
    },
    hierarchySettingsSubmitSuccess(state) {
      state.loadingOnHierarchySettingsSubmit = false;
    },
  },
});

export const {
  loadingHierarchySettings,
  hierarchySettingsUpdated,
  loadingOnHierarchySettingsSubmit,
  hierarchySettingsSubmitSuccess,
} = hierarchySettingsSlice.actions;

export default hierarchySettingsSlice.reducer;
