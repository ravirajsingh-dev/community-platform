import { combineReducers } from "redux";

import errors from "./errors";
import alert from "./alert";
import auth from "./auth";

// Users section
import user from "./user";
import notifications from "./notificationsReducer";
import dashboard from "./dashboardReducer";
import common from "./commonReducer";
import donation from "./donationReducer";
import profile from "./profileReducer";
import family from "./familyReducer";

// Dropdown data
import locationDropdown from "./locationDropdownReducer";
import masterDataDropdown from "./masterDataDropdownReducer";

// Search Member
import searchMember from "./searchMemberReducer";
import matrimonial from "./matrimonialReducer";
import membership from "./membershipReducer";
import wallet from "./walletReducer";

const rootReducer = combineReducers({
  errors,
  alert,
  auth,
  user,
  notifications,
  dashboard,
  common,
  donation,
  profile,
  family,
  locationDropdown,
  masterDataDropdown,
  searchMember,
  matrimonial,
  membership,
  wallet,
});

export default rootReducer;
