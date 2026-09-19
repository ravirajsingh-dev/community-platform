import { combineReducers } from "redux";

import errors from "./errors";
import alert from "./alert";

// Admin section
import adminAuth from "./adminAuth";
import adminUsers from "./adminUsersReducer";
import adminSubAdmins from "./adminSubAdminsReducer";

// admin default values
import adminCommonSettings from "./adminCommonSettingsReducer";
import adminDonation from "./adminDonationReducer";
import adminMembershipPlan from "./adminMembershipPlanReducer";
import adminPayments from "./adminPaymentsReducer";
import adminWallets from "./adminWalletsReducer";

import adminSlider from "./adminSliderReducer";
import adminGallery from "./adminGalleryReducer";
import adminVideo from "./adminVideoReducer";
import adminNews from "./adminNewsReducer";
import adminHowItWorks from "./adminHowItWorksReducer";
import adminCommunity from "./adminCommunityReducer";
import adminVansh from "./adminVanshReducer";
import adminKul from "./adminKulReducer";
import adminKhamp from "./adminKhampReducer";
import adminSubKhamp from "./adminSubKhampReducer";
import adminGotra from "./adminGotraReducer";
import adminHierarchyPending from "./adminHierarchyPendingReducer";
import adminHierarchySettings from "./adminHierarchySettingsReducer";
import adminMatrimonial from "./adminMatrimonialReducer";
import adminVillage from "./adminVillageReducer";
import adminFamily from "./adminFamilyReducer";
import masterDataDropdown from "./masterDataDropdownReducer";
import locationDropdown from "./locationDropdownReducer";

const rootReducer = combineReducers({
  errors,
  alert,
  adminAuth,
  adminUsers,
  adminSubAdmins,
  adminFamily,
  adminCommonSettings,
  adminDonation,
  adminMembershipPlan,
  adminPayments,
  adminWallets,
  slider: adminSlider,
  gallery: adminGallery,
  video: adminVideo,
  news: adminNews,
  howItWorks: adminHowItWorks,
  community: adminCommunity,
  vansh: adminVansh,
  kul: adminKul,
  khamp: adminKhamp,
  subKhamp: adminSubKhamp,
  gotra: adminGotra,
  adminHierarchyPending,
  adminHierarchySettings,
  adminMatrimonial,
  village: adminVillage,
  masterDataDropdown,
  locationDropdown,
});

export default rootReducer;
