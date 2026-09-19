import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  donationSettings: {
    donationEnabled: false,
    donationTitle: "",
    donationTitleHighlight: "",
    donationMessage: "",
    topDonationsEnabled: true,
    topDonationsLimit: 20,
    upi: { upiId: "", upiHolderName: "" },
    bank: {
      bankName: "",
      accountNo: "",
      accountHolderName: "",
      ifscCode: "",
    },
  },
  loadingDonationSettings: false,
  loadingOnDonationSettingsSubmit: false,
  donationButtons: [],
  donationRequests: {
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  },
  donationRequest: {},
  loadingDonationButtons: false,
  loadingDonationRequests: false,
  loadingOnDonationButtonSubmit: false,
  loadingOnDonationRequestAction: false,
};

const adminDonationSlice = createSlice({
  name: "adminDonation",
  initialState,
  reducers: {
    donationSettingsUpdated(state, action) {
      return {
        ...state,
        donationSettings: action.payload,
        loadingDonationSettings: false,
      };
    },
    loadingDonationSettings(state) {
      return {
        ...state,
        loadingDonationSettings: true,
      };
    },
    loadingOnDonationSettingsSubmit(state) {
      return {
        ...state,
        loadingOnDonationSettingsSubmit: true,
      };
    },
    donationSettingsSubmitSuccess(state) {
      return {
        ...state,
        loadingOnDonationSettingsSubmit: false,
      };
    },
    donationButtonsUpdated(state, action) {
      return {
        ...state,
        donationButtons: action.payload,
        loadingDonationButtons: false,
      };
    },
    loadingDonationButtons(state) {
      return {
        ...state,
        loadingDonationButtons: true,
      };
    },
    donationRequestsUpdated(state, action) {
      return {
        ...state,
        donationRequests: action.payload,
        loadingDonationRequests: false,
      };
    },
    loadingDonationRequests(state) {
      return {
        ...state,
        loadingDonationRequests: true,
      };
    },
    donationRequestUpdated(state, action) {
      return {
        ...state,
        donationRequest: action.payload,
      };
    },
    loadingOnDonationButtonSubmit(state) {
      return {
        ...state,
        loadingOnDonationButtonSubmit: true,
      };
    },
    donationButtonSubmitSuccess(state) {
      return {
        ...state,
        loadingOnDonationButtonSubmit: false,
      };
    },
    loadingOnDonationRequestAction(state) {
      return {
        ...state,
        loadingOnDonationRequestAction: true,
      };
    },
    donationRequestActionSuccess(state) {
      return {
        ...state,
        loadingOnDonationRequestAction: false,
      };
    },
    resetDonationState(state) {
      return {
        ...initialState,
      };
    },
  },
});

export const {
  donationSettingsUpdated,
  loadingDonationSettings,
  loadingOnDonationSettingsSubmit,
  donationSettingsSubmitSuccess,
  donationButtonsUpdated,
  loadingDonationButtons,
  donationRequestsUpdated,
  loadingDonationRequests,
  donationRequestUpdated,
  loadingOnDonationButtonSubmit,
  donationButtonSubmitSuccess,
  loadingOnDonationRequestAction,
  donationRequestActionSuccess,
  resetDonationState,
} = adminDonationSlice.actions;
export default adminDonationSlice.reducer;

