import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  plans: [],
  loadingPlans: false,
  plansError: null,
  creatingOrder: false,
  checkingPaymentStatus: false,
  lastPaymentStatus: null,
  currentMembership: null,
  loadingCurrentMembership: false,
  currentMembershipError: null,
  membershipPayments: [],
  membershipPaymentsCount: 0,
  loadingMembershipPayments: false,
  membershipPaymentsError: null,
};

const membershipSlice = createSlice({
  name: "membership",
  initialState,
  reducers: {
    loadingMembershipPlans(state) {
      state.loadingPlans = true;
      state.plansError = null;
    },
    membershipPlansUpdated(state, action) {
      state.loadingPlans = false;
      state.plans = action.payload || [];
      state.plansError = null;
    },
    membershipPlansError(state, action) {
      state.loadingPlans = false;
      state.plansError = action.payload || "Failed to load membership plans";
    },
    loadingOnCreateOrder(state) {
      state.creatingOrder = true;
    },
    createOrderSuccess(state) {
      state.creatingOrder = false;
    },
    createOrderFail(state) {
      state.creatingOrder = false;
    },
    loadingPaymentStatus(state) {
      state.checkingPaymentStatus = true;
    },
    paymentStatusUpdated(state, action) {
      state.checkingPaymentStatus = false;
      state.lastPaymentStatus = action.payload;
    },
    paymentStatusError(state) {
      state.checkingPaymentStatus = false;
    },
    loadingCurrentMembership(state) {
      state.loadingCurrentMembership = true;
      state.currentMembershipError = null;
    },
    currentMembershipUpdated(state, action) {
      state.loadingCurrentMembership = false;
      state.currentMembership = action.payload;
      state.currentMembershipError = null;
    },
    currentMembershipError(state, action) {
      state.loadingCurrentMembership = false;
      state.currentMembershipError =
        action.payload || "Failed to load membership";
    },
    loadingMembershipPayments(state) {
      state.loadingMembershipPayments = true;
      state.membershipPaymentsError = null;
    },
    membershipPaymentsUpdated(state, action) {
      state.loadingMembershipPayments = false;
      state.membershipPayments = action.payload?.data || [];
      state.membershipPaymentsCount = action.payload?.count || 0;
      state.membershipPaymentsError = null;
    },
    membershipPaymentsError(state, action) {
      state.loadingMembershipPayments = false;
      state.membershipPaymentsError =
        action.payload || "Failed to load payment history";
    },
    resetMembershipState() {
      return initialState;
    },
  },
});

export const {
  loadingMembershipPlans,
  membershipPlansUpdated,
  membershipPlansError,
  loadingOnCreateOrder,
  createOrderSuccess,
  createOrderFail,
  loadingPaymentStatus,
  paymentStatusUpdated,
  paymentStatusError,
  loadingCurrentMembership,
  currentMembershipUpdated,
  currentMembershipError,
  loadingMembershipPayments,
  membershipPaymentsUpdated,
  membershipPaymentsError,
  resetMembershipState,
} = membershipSlice.actions;

export default membershipSlice.reducer;
