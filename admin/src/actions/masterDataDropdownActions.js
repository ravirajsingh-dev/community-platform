import api from "@src/utils/axiosSetup";
import {
  setCommunities,
  setVanshes,
  setKuls,
  setKhamps,
  setSubKhamps,
  setGotras,
  loadingCommunities,
  loadingVanshes,
  loadingKuls,
  loadingKhamps,
  loadingSubKhamps,
  loadingGotras,
} from "@reducers/masterDataDropdownReducer";

const DROPDOWN_QUERY = "limit=100&page=1&activeOnly=true";

const toDropdownOption = (item) => ({
  value: item._id.toString(),
  label: item.name,
});

const parseDropdownList = (res) => {
  if (
    res.data?.status === true &&
    res.data.response &&
    res.data.response[0]
  ) {
    return res.data.response[0].data || [];
  }
  return [];
};

const appendOption = (existing, option) => {
  if (existing.some((item) => item.value === option.value)) {
    return existing;
  }
  return [...existing, option];
};

/**
 * Seed the user's hierarchy chain from GET labels — no list API calls on hydrate.
 */
export const seedMasterDataFromUserDetails = (userDetails) => (dispatch, getState) => {
  if (!userDetails) return;

  const communityId = userDetails.community
    ? String(userDetails.community._id || userDetails.community)
    : null;
  const vanshId = userDetails.vansh
    ? String(userDetails.vansh._id || userDetails.vansh)
    : null;
  const kulId = userDetails.kul
    ? String(userDetails.kul._id || userDetails.kul)
    : null;
  const khampId = userDetails.khamp
    ? String(userDetails.khamp._id || userDetails.khamp)
    : null;
  const subKhampId = userDetails.subKhamp
    ? String(userDetails.subKhamp._id || userDetails.subKhamp)
    : null;
  const gotraId = userDetails.gotra
    ? String(userDetails.gotra._id || userDetails.gotra)
    : null;

  if (communityId) {
    const communities = appendOption(getState().masterDataDropdown.communities, {
      value: communityId,
      label: userDetails.communityLabel || communityId,
    });
    if (communities !== getState().masterDataDropdown.communities) {
      dispatch(setCommunities({ data: communities }));
    }
  }

  if (communityId && vanshId) {
    const existing = getState().masterDataDropdown.vanshes[communityId] || [];
    const vanshes = appendOption(existing, {
      value: vanshId,
      label: userDetails.vanshLabel || vanshId,
    });
    if (vanshes !== existing) {
      dispatch(setVanshes({ communityId, data: vanshes }));
    }
  }

  if (vanshId && kulId) {
    const existing = getState().masterDataDropdown.kuls[vanshId] || [];
    const kuls = appendOption(existing, {
      value: kulId,
      label: userDetails.kulLabel || kulId,
    });
    if (kuls !== existing) {
      dispatch(setKuls({ vanshId, data: kuls }));
    }
  }

  if (kulId && khampId) {
    const existing = getState().masterDataDropdown.khamps[kulId] || [];
    const khamps = appendOption(existing, {
      value: khampId,
      label: userDetails.khampLabel || khampId,
    });
    if (khamps !== existing) {
      dispatch(setKhamps({ kulId, data: khamps }));
    }
  }

  if (khampId && subKhampId) {
    const existing = getState().masterDataDropdown.subKhamps[khampId] || [];
    const subKhamps = appendOption(existing, {
      value: subKhampId,
      label: userDetails.subKhampLabel || subKhampId,
    });
    if (subKhamps !== existing) {
      dispatch(setSubKhamps({ khampId, data: subKhamps }));
    }
  }

  if (kulId && gotraId) {
    const existing = getState().masterDataDropdown.gotras[kulId] || [];
    const gotras = appendOption(existing, {
      value: gotraId,
      label: userDetails.gotraLabel || gotraId,
    });
    if (gotras !== existing) {
      dispatch(setGotras({ kulId, data: gotras }));
    }
  }
};

export const fetchCommunities = () => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingCommunities) return;
  if (state.masterDataDropdown.communitiesListLoaded) return;
  dispatch(loadingCommunities());
  try {
    const res = await api.get(`/api/admin/communities?${DROPDOWN_QUERY}`);
    const formatted = parseDropdownList(res).map(toDropdownOption);
    dispatch(setCommunities({ data: formatted, listLoaded: true }));
  } catch (err) {
    dispatch(setCommunities({ data: [], listLoaded: false }));
  }
};

export const fetchVanshes = (communityId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingVanshes[communityId]) return;
  if (state.masterDataDropdown.vanshListsLoaded[communityId]) return;
  dispatch(loadingVanshes(communityId));
  try {
    const res = await api.get(
      `/api/admin/vansh?${DROPDOWN_QUERY}&communityId=${communityId}`,
    );
    const formatted = parseDropdownList(res).map(toDropdownOption);
    dispatch(setVanshes({ communityId, data: formatted, listLoaded: true }));
  } catch (err) {
    dispatch(setVanshes({ communityId, data: [], listLoaded: false }));
  }
};

export const fetchKuls = (vanshId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingKuls[vanshId]) return;
  if (state.masterDataDropdown.kulListsLoaded[vanshId]) return;
  dispatch(loadingKuls(vanshId));
  try {
    const res = await api.get(
      `/api/admin/kul?${DROPDOWN_QUERY}&vanshId=${vanshId}`,
    );
    const formatted = parseDropdownList(res).map(toDropdownOption);
    dispatch(setKuls({ vanshId, data: formatted, listLoaded: true }));
  } catch (err) {
    dispatch(setKuls({ vanshId, data: [], listLoaded: false }));
  }
};

export const fetchKhamps = (kulId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingKhamps[kulId]) return;
  if (state.masterDataDropdown.khampListsLoaded[kulId]) return;
  dispatch(loadingKhamps(kulId));
  try {
    const res = await api.get(
      `/api/admin/khamp?${DROPDOWN_QUERY}&kulId=${kulId}`,
    );
    const formatted = parseDropdownList(res).map(toDropdownOption);
    dispatch(setKhamps({ kulId, data: formatted, listLoaded: true }));
  } catch (err) {
    dispatch(setKhamps({ kulId, data: [], listLoaded: false }));
  }
};

export const fetchSubKhamps = (khampId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingSubKhamps[khampId]) return;
  if (state.masterDataDropdown.subKhampListsLoaded[khampId]) return;
  dispatch(loadingSubKhamps(khampId));
  try {
    const res = await api.get(
      `/api/admin/sub-khamp?${DROPDOWN_QUERY}&khampId=${khampId}`,
    );
    const formatted = parseDropdownList(res).map(toDropdownOption);
    dispatch(setSubKhamps({ khampId, data: formatted, listLoaded: true }));
  } catch (err) {
    dispatch(setSubKhamps({ khampId, data: [], listLoaded: false }));
  }
};

export const fetchGotras = (kulId) => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingGotras[kulId]) return;
  if (state.masterDataDropdown.gotraListsLoaded[kulId]) return;
  dispatch(loadingGotras(kulId));
  try {
    const res = await api.get(
      `/api/admin/gotra?${DROPDOWN_QUERY}&kulId=${kulId}`,
    );
    const formatted = parseDropdownList(res).map(toDropdownOption);
    dispatch(setGotras({ kulId, data: formatted, listLoaded: true }));
  } catch (err) {
    dispatch(setGotras({ kulId, data: [], listLoaded: false }));
  }
};
