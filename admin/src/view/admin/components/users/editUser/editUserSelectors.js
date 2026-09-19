export const selectEditUserState = (state) => ({
  errorList: state.errors,
  loadingUserDetails: state.adminUsers.loadingUserDetails,
  currentUser: state.adminUsers.currentUser,
  masterDataDropdown: state.masterDataDropdown,
  locationDropdown: state.locationDropdown,
});
