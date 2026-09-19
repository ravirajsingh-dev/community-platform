import { useMemo } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import {
  editUser,
  setErrors,
  removeUserErrors,
  getUserById,
  resetComponentStore,
} from "@actions/adminUserActions";
import {
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchSubKhamps,
  fetchGotras,
} from "@actions/masterDataDropdownActions";
import { selectEditUserState } from "../editUserSelectors";

export function useEditUserPage() {
  const dispatch = useDispatch();
  const { errorList, loadingUserDetails, currentUser, masterDataDropdown, locationDropdown } =
    useSelector(selectEditUserState, shallowEqual);

  const actions = useMemo(
    () => ({
      editUser: (...args) => dispatch(editUser(...args)),
      setErrors: (...args) => dispatch(setErrors(...args)),
      removeUserErrors: () => dispatch(removeUserErrors()),
      getUserById: (...args) => dispatch(getUserById(...args)),
      resetComponentStore: () => dispatch(resetComponentStore()),
      fetchCommunities: () => dispatch(fetchCommunities()),
      fetchVanshes: (...args) => dispatch(fetchVanshes(...args)),
      fetchKuls: (...args) => dispatch(fetchKuls(...args)),
      fetchKhamps: (...args) => dispatch(fetchKhamps(...args)),
      fetchSubKhamps: (...args) => dispatch(fetchSubKhamps(...args)),
      fetchGotras: (...args) => dispatch(fetchGotras(...args)),
    }),
    [dispatch],
  );

  return {
    errorList,
    loadingUserDetails,
    currentUser,
    masterDataDropdown,
    locationDropdown,
    ...actions,
  };
}
