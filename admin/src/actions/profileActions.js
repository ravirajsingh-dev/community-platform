import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@reducers/errors";
import { adminLoaded, logoutAdminAuth } from "@reducers/adminAuth";
import { normalizeErrors } from "@src/utils/helper";

export const getMyProfile = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlert());

  try {
    const res = await api.get("/api/admin/profile/me");

    if (res.data.status === true) {
      return { status: true, data: res.data.response };
    }

    dispatch(setAlert(res.data.message || "Failed to fetch profile.", "danger"));
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAdminAuth());
      return { status: false, data: null };
    }

    const errors = normalizeErrors(err.response?.data?.errors);
    if (errors?.length) {
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to fetch profile.",
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};

export const updateMyProfile = (formData) => async (dispatch, getState) => {
  dispatch(removeErrors());
  dispatch(removeAlert());

  try {
    const res = await api.put("/api/admin/profile/me", formData, {
      headers: { "Content-Type": "application/json" },
    });

    if (res.data.status === true) {
      const currentAdmin = getState().adminAuth?.admin || {};
      dispatch(
        adminLoaded({
          ...currentAdmin,
          ...res.data.response,
        }),
      );
      dispatch(
        setAlert(
          res.data.message || "Profile updated successfully.",
          "success",
        ),
      );
      return { status: true, data: res.data.response };
    }

    const errors = normalizeErrors(res.data.errors || []);
    if (errors?.length) {
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(setAlert(res.data.message || "Failed to update profile.", "danger"));
    return { status: false, data: null };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(logoutAdminAuth());
      return { status: false, data: null };
    }

    const errors = normalizeErrors(err.response?.data?.errors);
    if (errors?.length) {
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(
      setAlert(
        err.response?.data?.message || "Failed to update profile.",
        "danger",
      ),
    );
    return { status: false, data: null };
  }
};
