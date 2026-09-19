import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { adminLogout } from "./adminAuth";

export const getLegalPages = () => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get("/api/admin/legal-pages", config);
    const rows = res.data?.response;
    if (!Array.isArray(rows)) {
      dispatch(setAlert("Failed to load legal pages.", "danger"));
      return { status: false, data: [] };
    }
    return { status: true, data: rows };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
      return { status: false, data: [] };
    }
    const message =
      err.response?.data?.message || err.message || "Failed to load legal pages.";
    dispatch(setAlert(message, "danger"));
    return { status: false, data: [] };
  }
};

export const updateLegalPage = (slug, payload) => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.put(`/api/admin/legal-pages/${slug}`, payload, config);
    if (res.data?.status === true) {
      dispatch(setAlert(res.data.message || "Saved successfully.", "success"));
      return { status: true };
    }
    dispatch(setAlert(res.data?.message || "Save failed.", "danger"));
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
      return { status: false };
    }
    const message = err.response?.data?.message || err.message || "Save failed.";
    dispatch(setAlert(message, "danger"));
    return { status: false };
  }
};
