import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  howItWorksSettingsLoaded,
  loadingHowItWorksSettings,
  savingHowItWorksSettings,
  howItWorksSettingsSaved,
  howItWorksError,
  resetHowItWorks,
} from "@reducers/adminHowItWorksReducer";

export const getHowItWorksSettings = () => async (dispatch) => {
  try {
    dispatch(loadingHowItWorksSettings());
    const res = await api.get("/api/admin/how-it-works/settings");

    if (res.data?.status && res.data.response) {
      dispatch(howItWorksSettingsLoaded(res.data.response));
    } else {
      const errorMsg = res.data?.message || "Error fetching how it works settings";
      dispatch(howItWorksError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const errorMsg =
        err.response?.data?.message || "Error fetching how it works settings";
      dispatch(setAlert(errorMsg, "danger"));
      dispatch(howItWorksError());
    }
  }
};

export const updateHowItWorksSettings = (payload, onSuccess) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    dispatch(savingHowItWorksSettings());
    const res = await api.put("/api/admin/how-it-works/settings", payload);

    if (res.data?.status) {
      dispatch(howItWorksSettingsSaved(res.data.response));
      dispatch(setAlert("How it works settings updated successfully.", "success"));
      if (onSuccess) {
        onSuccess();
      }
    } else {
      const errors = res.data?.errors || [];
      dispatch(howItWorksError());
      dispatch(
        setAlert(res.data?.message || "Error updating how it works settings", "danger")
      );
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        howItWorksError({
          msg: err.response?.statusText,
          status: err.response?.status,
        })
      );
      const errors = err.response?.data?.errors || [];
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      dispatch(
        setAlert(
          err.response?.data?.message || "Error updating how it works settings",
          "danger"
        )
      );
    }
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetHowItWorks());
};

export const removeHowItWorksErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};
