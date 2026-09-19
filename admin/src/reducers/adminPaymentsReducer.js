import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  payments: {
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  },
  payment: null,
  paymentStats: {
    todayRevenue: 0,
    todayTransactions: 0,
    pendingPayments: 0,
    successfulPayments: 0,
    totalRevenue: 0,
  },
  loadingPayments: false,
  loadingPaymentDetail: false,
  loadingPaymentStats: false,
};

const adminPaymentsSlice = createSlice({
  name: "adminPayments",
  initialState,
  reducers: {
    paymentsUpdated(state, action) {
      return {
        ...state,
        payments: action.payload,
        loadingPayments: false,
      };
    },
    loadingPayments(state) {
      return { ...state, loadingPayments: true };
    },
    paymentUpdated(state, action) {
      return {
        ...state,
        payment: action.payload,
        loadingPaymentDetail: false,
      };
    },
    loadingPaymentDetail(state) {
      return { ...state, loadingPaymentDetail: true };
    },
    paymentStatsUpdated(state, action) {
      return {
        ...state,
        paymentStats: action.payload,
        loadingPaymentStats: false,
      };
    },
    loadingPaymentStats(state) {
      return { ...state, loadingPaymentStats: true };
    },
    resetPaymentsState() {
      return initialState;
    },
  },
});

export const {
  paymentsUpdated,
  loadingPayments,
  paymentUpdated,
  loadingPaymentDetail,
  paymentStatsUpdated,
  loadingPaymentStats,
  resetPaymentsState,
} = adminPaymentsSlice.actions;

export default adminPaymentsSlice.reducer;
