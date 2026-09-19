import api from "@src/utils/axiosSetup";

import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { loadingOnUserSubmit, userError, userUpdated } from "@src/reducers/user";
import { loadUser } from "./auth";

// Get user details
export const getUserDetails = () => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.get(`/api/users/details`, config);

    if (res.data.status === true) {
      return res.data.response;
    } else {
      const errors = res.data.errors;
      if (errors) {
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      return null;
    }
  } catch (err) {
    console.error("Error fetching user details:", err);
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    return null;
  }
};

// Create or update user details
export const createOrUpdateUserDetails = (formData, navigate) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(loadingOnUserSubmit());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.post(`/api/users/details`, formData, config);

    if (res.data.status === true) {
      dispatch(userUpdated(res.data.response));
      dispatch(setAlert("Profile details saved successfully", "success"));
      dispatch(loadUser(navigate));
      if (navigate) {
        navigate("/user/profile");
      }
      return res.data.response;
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(userError());
        dispatch(setAlert(res.data.message, "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      return null;
    }
  } catch (err) {
    console.error("Error saving user details:", err);
    dispatch(userError());
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    return null;
  }
};

// Get user with details combined
export const getUserWithDetails = () => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.get(`/api/users/user-with-details`, config);

    if (res.data.status === true) {
      return res.data.response;
    } else {
      const errors = res.data.errors;
      if (errors) {
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      return null;
    }
  } catch (err) {
    console.error("Error fetching user with details:", err);
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    return null;
  }
};
