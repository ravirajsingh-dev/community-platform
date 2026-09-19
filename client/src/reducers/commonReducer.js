import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sevaKendraList: {
    page: 1,
    data: [],
    count: 0,
  },
  loadingSevaKendra: false,
  servicesList: [],
  productsList: [],
  productServicesList: [],
  productServiceCategoriesList: [],
  adminPrimeCredentialsList: [],
  adminDetails: {},
  dashboardDetails: {},
  dashboardDetailsLoading: true,
  adminDetailsLoading: true,
  adminPrimeCredentialsLoading: true,
  loadingGenerateQRCode: false,
  amountQRCode: "",
  commonSettings: {
    name: "",
    abbreviation: "",
    developedBy: "",
    developedByLink: "",
    socialMedia: {
      links: [],
    },
    aboutUs: {
      title: "",
      intro: "",
      sections: [],
    },
    contactUsPage: {
      title: "",
      intro: "",
      phone: "",
      secondaryPhone: "",
      email: "",
      address: "",
      businessHours: "",
    },
    comingSoon: {
      enabled: true,
      title: "Coming Soon",
      description: "",
      menuItems: [],
    },
    loginEnabled: true,
    registerEnabled: true,
    paymentGateway: {
      enabled: false,
      provider: "cashfree",
    },
  },
  loadingCommonSettings: false,
};

const commonSlice = createSlice({
  name: "common",
  initialState,
  reducers: {
    servicesListUpdated(state, action) {
      return {
        ...state,
        servicesList: action.payload,
      };
    },

    productsListUpdated(state, action) {
      return {
        ...state,
        productsList: action.payload,
      };
    },

    productServicesListUpdated(state, action) {
      return {
        ...state,
        productServicesList: action.payload,
      };
    },

    productServiceCategoriesListUpdated(state, action) {
      return {
        ...state,
        productServiceCategoriesList: action.payload,
      };
    },

    loadingOnGenerateQRCode(state) {
      return {
        ...state,
        loadingGenerateQRCode: true,
      };
    },

    generateQRCodeUpdated(state, action) {
      return {
        ...state,
        amountQRCode: action.payload,
        loadingGenerateQRCode: false,
      };
    },

    adminPrimeCredentialListUpdated(state, action) {
      return {
        ...state,
        adminPrimeCredentialsList: action.payload,
        adminPrimeCredentialsLoading: false,
      };
    },
    adminDetailsUpdated(state, action) {
      return {
        ...state,
        adminDetails: action.payload,
        adminDetailsLoading: false,
      };
    },
    userDashboardDetailsUpdated(state, action) {
      return {
        ...state,
        dashboardDetails: action.payload,
        dashboardDetailsLoading: false,
      };
    },

    sevaKendraUpdated(state, action) {
      return {
        ...state,
        sevaKendraList: {
          data: action.payload.data,
          page: action.payload.metadata[0].current_page,
          count: action.payload.metadata[0].totalRecord,
        },
        loadingSevaKendra: false,
      };
    },

    loadingSevaKendra(state) {
      return {
        ...state,
        loadingSevaKendra: true,
      };
    },

    commonSettingsUpdated(state, action) {
      return {
        ...state,
        commonSettings: action.payload,
        loadingCommonSettings: false,
      };
    },

    commonSettingsLoadFailed(state) {
      return {
        ...state,
        loadingCommonSettings: false,
      };
    },

    loadingCommonSettings(state) {
      return {
        ...state,
        loadingCommonSettings: true,
      };
    },
  },
});

export const {
  userDashboardDetailsUpdated,
  servicesListUpdated,
  productsListUpdated,
  productServicesListUpdated,
  productServiceCategoriesListUpdated,
  loadingOnGenerateQRCode,
  generateQRCodeUpdated,
  adminPrimeCredentialListUpdated,
  adminDetailsUpdated,
  sevaKendraUpdated,
  loadingSevaKendra,
  commonSettingsUpdated,
  commonSettingsLoadFailed,
  loadingCommonSettings,
} = commonSlice.actions;
export default commonSlice.reducer;
