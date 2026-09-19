import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  memberId: "",
  balance: 0,
  wallet: null,
  transactions: [],
  transactionsCount: 0,
  referrals: [],
  referralsCount: 0,
  loadingWallet: false,
  loadingReferrals: false,
  walletError: null,
  referralsError: null,
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    loadingWallet(state) {
      state.loadingWallet = true;
      state.walletError = null;
    },
    walletUpdated(state, action) {
      const payload = action.payload || {};
      state.loadingWallet = false;
      state.walletError = null;
      state.memberId = payload.memberId || "";
      state.balance = payload.balance ?? 0;
      state.wallet = payload.wallet || null;
      state.transactions = payload.data || [];
      state.transactionsCount = payload.pagination?.total || 0;
    },
    walletError(state, action) {
      state.loadingWallet = false;
      state.walletError = action.payload || "Failed to load wallet";
    },
    loadingReferrals(state) {
      state.loadingReferrals = true;
      state.referralsError = null;
    },
    referralsUpdated(state, action) {
      const payload = action.payload || {};
      state.loadingReferrals = false;
      state.referralsError = null;
      state.referrals = payload.data || [];
      state.referralsCount = payload.pagination?.total || 0;
    },
    referralsError(state, action) {
      state.loadingReferrals = false;
      state.referralsError = action.payload || "Failed to load referrals";
    },
    resetWalletState() {
      return initialState;
    },
  },
});

export const {
  loadingWallet,
  walletUpdated,
  walletError,
  loadingReferrals,
  referralsUpdated,
  referralsError,
  resetWalletState,
} = walletSlice.actions;

export default walletSlice.reducer;
