import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  donationButtons: [],
  donationSettings: {
    donationEnabled: false,
    donationTitle: "",
    donationTitleHighlight: "",
    donationMessage: "",
    topDonationsEnabled: true,
    topDonationsLimit: 20,
    upi: {
      upiId: "",
      upiHolderName: "",
    },
    bank: {
      bankName: "",
      accountNo: "",
      accountHolderName: "",
      ifscCode: "",
    },
  },
  qrCodeData: "",
  topDonations: [],
  loadingDonationButtons: false,
  loadingDonationSettings: false,
  loadingQRCode: false,
  loadingSubmitDonation: false,
  loadingTopDonations: false,
};

const donationSlice = createSlice({
  name: "donation",
  initialState,
  reducers: {
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
    qrCodeUpdated(state, action) {
      return {
        ...state,
        qrCodeData: action.payload,
        loadingQRCode: false,
      };
    },
    loadingQRCode(state) {
      return {
        ...state,
        loadingQRCode: true,
      };
    },
    clearQRCode(state) {
      return {
        ...state,
        qrCodeData: "",
        loadingQRCode: false,
      };
    },
    loadingSubmitDonation(state) {
      return {
        ...state,
        loadingSubmitDonation: true,
      };
    },
    submitDonationSuccess(state) {
      return {
        ...state,
        loadingSubmitDonation: false,
      };
    },
    resetDonationState(state) {
      return {
        ...initialState,
      };
    },
    topDonationsUpdated(state, action) {
      return {
        ...state,
        topDonations: action.payload,
        loadingTopDonations: false,
      };
    },
    loadingTopDonations(state) {
      return {
        ...state,
        loadingTopDonations: true,
      };
    },
  },
});

export const {
  donationButtonsUpdated,
  loadingDonationButtons,
  donationSettingsUpdated,
  loadingDonationSettings,
  qrCodeUpdated,
  loadingQRCode,
  clearQRCode,
  loadingSubmitDonation,
  submitDonationSuccess,
  resetDonationState,
  topDonationsUpdated,
  loadingTopDonations,
} = donationSlice.actions;
export default donationSlice.reducer;
