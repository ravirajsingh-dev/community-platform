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
  loadingCreatableLevels,
  setCreatableLevels,
} from "@src/reducers/masterDataDropdownReducer";
import { setAlert } from "./alert";

const DEFAULT_CREATABLE_LEVELS = [
  "community",
  "vansh",
  "kul",
  "khamp",
  "subKhamp",
  "gotra",
];

export const fetchCreatableLevels = () => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.creatableLevelsLoaded) {
    return { userCreatableLevels: state.masterDataDropdown.creatableLevels };
  }
  if (state.masterDataDropdown.loadingCreatableLevels) {
    return { userCreatableLevels: state.masterDataDropdown.creatableLevels };
  }

  dispatch(loadingCreatableLevels());
  try {
    const res = await api.get("/api/users/master-data/creatable-levels");
    if (res.data?.status === true && res.data.response) {
      const levels =
        res.data.response.userCreatableLevels || DEFAULT_CREATABLE_LEVELS;
      dispatch(setCreatableLevels(levels));
      return { userCreatableLevels: levels };
    }
  } catch (err) {
    console.error("Error fetching creatable hierarchy levels:", err);
  }

  dispatch(setCreatableLevels(DEFAULT_CREATABLE_LEVELS));
  return { userCreatableLevels: DEFAULT_CREATABLE_LEVELS };
};

/**
 * Fetch communities for dropdown
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchCommunities = () => async (dispatch, getState) => {
  const state = getState();
  if (state.masterDataDropdown.loadingCommunities) {
    return { data: state.masterDataDropdown.communities };
  }
  if (state.masterDataDropdown.communities.length > 0) {
    return { data: state.masterDataDropdown.communities };
  }

  dispatch(loadingCommunities());
  try {
    const res = await api.get("/api/users/master-data/communities");
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setCommunities(formatted));
      return { data: formatted };
    } else {
      dispatch(setCommunities([]));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching communities:", err);
    dispatch(setCommunities([]));
    return { data: [] };
  }
};

/**
 * Fetch vanshes for a community
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchVanshes = (communityId) => async (dispatch, getState) => {
  if (!communityId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingVanshes[communityId]) {
    return { data: state.masterDataDropdown.vanshes[communityId] || [] };
  }
  if (state.masterDataDropdown.vanshes[communityId]) {
    return { data: state.masterDataDropdown.vanshes[communityId] };
  }

  dispatch(loadingVanshes(communityId));
  try {
    const res = await api.get(
      `/api/users/master-data/vanshes?communityId=${communityId}`,
    );
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setVanshes({ communityId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setVanshes({ communityId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching vanshes:", err);
    dispatch(setVanshes({ communityId, data: [] }));
    return { data: [] };
  }
};

/**
 * Fetch kuls for a vansh
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchKuls = (vanshId) => async (dispatch, getState) => {
  if (!vanshId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingKuls[vanshId]) {
    return { data: state.masterDataDropdown.kuls[vanshId] || [] };
  }
  if (state.masterDataDropdown.kuls[vanshId]) {
    return { data: state.masterDataDropdown.kuls[vanshId] };
  }

  dispatch(loadingKuls(vanshId));
  try {
    const res = await api.get(`/api/users/master-data/kuls?vanshId=${vanshId}`);
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setKuls({ vanshId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setKuls({ vanshId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching kuls:", err);
    dispatch(setKuls({ vanshId, data: [] }));
    return { data: [] };
  }
};

/**
 * Fetch khamps for a kul
 * Returns data in format: { data: [{ value, label, status }] }
 */
export const fetchKhamps = (kulId) => async (dispatch, getState) => {
  if (!kulId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingKhamps[kulId]) {
    return { data: state.masterDataDropdown.khamps[kulId] || [] };
  }
  if (state.masterDataDropdown.khamps[kulId]) {
    return { data: state.masterDataDropdown.khamps[kulId] };
  }

  dispatch(loadingKhamps(kulId));
  try {
    const res = await api.get(`/api/users/master-data/khamps?kulId=${kulId}`);
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setKhamps({ kulId, data: formatted }));
      return { data: formatted };
    } else {
      dispatch(setKhamps({ kulId, data: [] }));
      return { data: [] };
    }
  } catch (err) {
    console.error("Error fetching khamps:", err);
    dispatch(setKhamps({ kulId, data: [] }));
    return { data: [] };
  }
};

/**
 * Create a new community
 */
export const createCommunity = (name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/communities", {
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached communities
      dispatch(setCommunities([]));
      dispatch(setAlert("Community created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(
          response.data?.message || "Failed to create community",
          "danger",
        ),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating community:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create community",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Create a new vansh
 */
export const createVansh = (communityId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/vanshes", {
      communityId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached vanshes for this community
      dispatch(setVanshes({ communityId, data: [] }));
      dispatch(setAlert("Vansh created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(response.data?.message || "Failed to create vansh", "danger"),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating vansh:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create vansh",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Create a new kul
 */
export const createKul = (vanshId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/kuls", {
      vanshId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached kuls for this vansh
      dispatch(setKuls({ vanshId, data: [] }));
      dispatch(setAlert("Kul created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(response.data?.message || "Failed to create kul", "danger"),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating kul:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create kul",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Create a new khamp
 */
export const createKhamp = (kulId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/khamps", {
      kulId,
      name,
    });
    if (response.data?.status === true) {
      // Invalidate cached khamps for this kul
      dispatch(setKhamps({ kulId, data: [] }));
      dispatch(setAlert("Khamp created successfully", "success"));
      return response.data;
    } else {
      dispatch(
        setAlert(response.data?.message || "Failed to create khamp", "danger"),
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating khamp:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create khamp",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Fetch sub-khamps for a khamp
 */
export const fetchSubKhamps = (khampId) => async (dispatch, getState) => {
  if (!khampId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingSubKhamps[khampId]) {
    return { data: state.masterDataDropdown.subKhamps[khampId] || [] };
  }
  if (state.masterDataDropdown.subKhamps[khampId]) {
    return { data: state.masterDataDropdown.subKhamps[khampId] };
  }

  dispatch(loadingSubKhamps(khampId));
  try {
    const res = await api.get(
      `/api/users/master-data/sub-khamps?khampId=${khampId}`,
    );
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setSubKhamps({ khampId, data: formatted }));
      return { data: formatted };
    }
    dispatch(setSubKhamps({ khampId, data: [] }));
    return { data: [] };
  } catch (err) {
    console.error("Error fetching sub-khamps:", err);
    dispatch(setSubKhamps({ khampId, data: [] }));
    return { data: [] };
  }
};

/**
 * Create a new sub-khamp
 */
export const createSubKhamp = (khampId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/sub-khamps", {
      khampId,
      name,
    });
    if (response.data?.status === true) {
      dispatch(setSubKhamps({ khampId, data: [] }));
      dispatch(setAlert("Sub-Khamp created successfully", "success"));
      return response.data;
    }
    dispatch(
      setAlert(
        response.data?.message || "Failed to create sub-khamp",
        "danger",
      ),
    );
    return null;
  } catch (error) {
    console.error("Error creating sub-khamp:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create sub-khamp",
        "danger",
      ),
    );
    return null;
  }
};

/**
 * Fetch gotras for a kul (shared across Khamp/Sub-Khamp under that kul)
 */
export const fetchGotras = (kulId) => async (dispatch, getState) => {
  if (!kulId) return { data: [] };

  const state = getState();
  if (state.masterDataDropdown.loadingGotras[kulId]) {
    return { data: state.masterDataDropdown.gotras[kulId] || [] };
  }
  if (state.masterDataDropdown.gotras[kulId]) {
    return { data: state.masterDataDropdown.gotras[kulId] };
  }

  dispatch(loadingGotras(kulId));
  try {
    const res = await api.get(
      `/api/users/master-data/gotras?kulId=${kulId}`,
    );
    if (res.data?.status === true && res.data.response) {
      const formatted = Array.isArray(res.data.response)
        ? res.data.response
        : [];
      dispatch(setGotras({ kulId, data: formatted }));
      return { data: formatted };
    }
    dispatch(setGotras({ kulId, data: [] }));
    return { data: [] };
  } catch (err) {
    console.error("Error fetching gotras:", err);
    dispatch(setGotras({ kulId, data: [] }));
    return { data: [] };
  }
};

/**
 * Create a new gotra under a kul
 */
export const createGotra = (kulId, name) => async (dispatch) => {
  try {
    const response = await api.post("/api/users/master-data/gotras", {
      kulId,
      name,
    });
    if (response.data?.status === true) {
      dispatch(setGotras({ kulId, data: [] }));
      dispatch(setAlert("Gotra created successfully", "success"));
      return response.data;
    }
    dispatch(
      setAlert(response.data?.message || "Failed to create gotra", "danger"),
    );
    return null;
  } catch (error) {
    console.error("Error creating gotra:", error);
    dispatch(
      setAlert(
        error.response?.data?.message || "Failed to create gotra",
        "danger",
      ),
    );
    return null;
  }
};
