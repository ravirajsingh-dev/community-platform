import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  membershipPlans: {
    data: [],
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      pages: 0,
    },
  },
  membershipPlan: null,
  loadingMembershipPlans: false,
  loadingOnMembershipPlanSubmit: false,
};

const adminMembershipPlanSlice = createSlice({
  name: "adminMembershipPlan",
  initialState,
  reducers: {
    membershipPlansUpdated(state, action) {
      return {
        ...state,
        membershipPlans: action.payload,
        loadingMembershipPlans: false,
      };
    },
    loadingMembershipPlans(state) {
      return { ...state, loadingMembershipPlans: true };
    },
    membershipPlanUpdated(state, action) {
      return { ...state, membershipPlan: action.payload };
    },
    loadingOnMembershipPlanSubmit(state) {
      return { ...state, loadingOnMembershipPlanSubmit: true };
    },
    membershipPlanSubmitSuccess(state) {
      return { ...state, loadingOnMembershipPlanSubmit: false };
    },
    resetMembershipPlanState() {
      return initialState;
    },
  },
});

export const {
  membershipPlansUpdated,
  loadingMembershipPlans,
  membershipPlanUpdated,
  loadingOnMembershipPlanSubmit,
  membershipPlanSubmitSuccess,
  resetMembershipPlanState,
} = adminMembershipPlanSlice.actions;

export default adminMembershipPlanSlice.reducer;
