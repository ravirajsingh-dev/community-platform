import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  wallets: {
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  },
  transactions: {
    wallet: null,
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  },
  adminAdjustments: {
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  },
  loadingWallets: false,
  loadingTransactions: false,
  loadingAdminAdjustments: false,
  adjustingWallet: false,
};

const adminWalletsSlice = createSlice({
  name: "adminWallets",
  initialState,
  reducers: {
    walletsUpdated(state, action) {
      return {
        ...state,
        wallets: action.payload,
        loadingWallets: false,
      };
    },
    loadingWallets(state) {
      return { ...state, loadingWallets: true };
    },
    transactionsUpdated(state, action) {
      return {
        ...state,
        transactions: action.payload,
        loadingTransactions: false,
      };
    },
    loadingTransactions(state) {
      return { ...state, loadingTransactions: true };
    },
    adminAdjustmentsUpdated(state, action) {
      return {
        ...state,
        adminAdjustments: action.payload,
        loadingAdminAdjustments: false,
      };
    },
    loadingAdminAdjustments(state) {
      return { ...state, loadingAdminAdjustments: true };
    },
    adjustingWallet(state) {
      return { ...state, adjustingWallet: true };
    },
    adjustWalletDone(state) {
      return { ...state, adjustingWallet: false };
    },
    resetWalletsState() {
      return initialState;
    },
  },
});

export const {
  walletsUpdated,
  loadingWallets,
  transactionsUpdated,
  loadingTransactions,
  adminAdjustmentsUpdated,
  loadingAdminAdjustments,
  adjustingWallet,
  adjustWalletDone,
  resetWalletsState,
} = adminWalletsSlice.actions;

export default adminWalletsSlice.reducer;
