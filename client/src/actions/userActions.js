import api from "@src/utils/axiosSetup";

// Custom imports
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import {
  loadingOnUserSubmit,
  userError,
  userUpdated,
} from "@src/reducers/user";
import { loadUser, logout } from "./auth";

// Edit User Name
export const updateUserById =
  (formData, user_id, navigate) => async (dispatch) => {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(loadingOnUserSubmit());
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };
      const res = await api.put(`/api/users/${user_id}`, formData, config);
      if (res.data.status === true) {
        dispatch(userUpdated(res.data.response));
        dispatch(setAlert("Profile Updated Successfully.", "success"));
        dispatch(loadUser(navigate));
      } else {
        const errors = res.data.errors;
        if (errors) {
          dispatch(userError());

          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
            dispatch(setAlert(error.msg, "danger"));
          });
        }
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response.data && err.response.data.tokenStatus === 0) {
        dispatch(logout());
      } else {
        err.response &&
          dispatch(
            userError({
              msg: err.response.statusText,
              status: err.response.status,
            })
          );

        dispatch(setAlert(err.response.message, "danger"));
      }
    }
  };

// Update user avatar
export const updateAvatarByUserId =
  (formData, user_id, navigate) => async (dispatch) => {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(loadingOnUserSubmit());
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };
      const res = await api.put(
        `/api/users/${user_id}/avatar`,
        formData,
        config
      );
      if (res.data.status === true) {
        dispatch(userUpdated(res.data.response));
        dispatch(loadUser(navigate));
        navigate("/user/profile");
        dispatch(setAlert("Avatar Updated.", "success"));
      } else {
        const errors = res.data.errors;
        if (errors) {
          dispatch(userError());
          dispatch(setAlert(res.data.message, "danger"));

          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response.data && err.response.data.tokenStatus === 0) {
        dispatch(logout());
      } else {
        err.response &&
          dispatch(
            userError({
              msg: err.response.statusText,
              status: err.response.status,
            })
          );

        dispatch(setAlert(err.response.message, "danger"));
      }
    }
  };

export const setErrors = (errors) => async (dispatch) => {
  if (errors) {
    dispatch(userError());
    dispatch(setAlert("Please correct the following errors", "danger"));
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg, error.path));
    });
  }
};

// reset errors
export const removeUserErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};
