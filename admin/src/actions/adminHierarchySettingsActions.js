import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/actions/alert";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "@src/actions/adminAuth";
import {
  hierarchySettingsUpdated,
  loadingHierarchySettings,
  loadingOnHierarchySettingsSubmit,
  hierarchySettingsSubmitSuccess,
} from "@src/reducers/adminHierarchySettingsReducer";

export const HIERARCHY_CREATABLE_LEVEL_OPTIONS = [
  { key: "community", label: "Community" },
  { key: "vansh", label: "Vansh" },
  { key: "kul", label: "Kul" },
  { key: "khamp", label: "Khamp" },
  { key: "subKhamp", label: "Sub-Khamp" },
  { key: "gotra", label: "Gotra" },
];

export const getHierarchySettings = () => async (dispatch) => {
  try {
    dispatch(loadingHierarchySettings());
    const res = await api.get("/api/admin/settings/hierarchy");

    if (res.data?.status === true) {
      dispatch(hierarchySettingsUpdated(res.data.response));
    }
    return res.data ?? { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error fetching hierarchy settings",
          "danger",
        ),
      );
    }
    return { status: false };
  }
};

export const updateHierarchySettings = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnHierarchySettingsSubmit());
  try {
    const res = await api.put("/api/admin/settings/hierarchy", formData, {
      headers: { "Content-Type": "application/json" },
    });

    if (res.data?.status === true) {
      dispatch(hierarchySettingsSubmitSuccess());
      dispatch(hierarchySettingsUpdated(res.data.response));
      dispatch(setAlert("Hierarchy settings updated successfully", "success"));
      return res.data;
    }

    dispatch(hierarchySettingsSubmitSuccess());
    if (res.data?.errors) {
      res.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(
      setAlert(res.data?.message || "Error updating hierarchy settings", "danger"),
    );
    return res.data ?? { status: false };
  } catch (err) {
    dispatch(hierarchySettingsSubmitSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error updating hierarchy settings",
          "danger",
        ),
      );
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
    }
    return { status: false };
  }
};
