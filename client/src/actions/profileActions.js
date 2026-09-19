import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import {
  PROFILE_REQUEST,
  PROFILE_SUCCESS,
  PROFILE_FAIL,
  PROFILE_UPDATE_SUCCESS,
  PROFILE_REQUIREMENTS_REQUEST,
  PROFILE_REQUIREMENTS_SUCCESS,
  PROFILE_REQUIREMENTS_FAIL,
} from "@src/reducers/profileReducer";

const MEMBERSHIP_BLOCKED_CODES = new Set([
  "MEMBERSHIP_INACTIVE",
  "MEMBERSHIP_EXPIRED",
  "PAYMENT_REQUIRED",
]);

const isMembershipBlockedResponse = (err) => {
  const code = err?.response?.data?.code;
  return (
    err?.response?.status === 403 &&
    (MEMBERSHIP_BLOCKED_CODES.has(code) || Boolean(err?.response?.data?.membershipStatus))
  );
};

/**
 * Get profile field requirements (server source of truth)
 */
export const getProfileRequirements = () => async (dispatch) => {
  try {
    dispatch(PROFILE_REQUIREMENTS_REQUEST());

    const res = await api.get("/api/users/profile-requirements", {
      headers: { "Content-Type": "application/json" },
    });

    if (res.data.status === true) {
      dispatch(PROFILE_REQUIREMENTS_SUCCESS(res.data.response));
      return res.data.response;
    }

    dispatch(
      PROFILE_REQUIREMENTS_FAIL(
        res.data.message || "Failed to load profile requirements",
      ),
    );
    return null;
  } catch (err) {
    console.error("Error fetching profile requirements:", err);
    const errorMessage =
      err.response?.data?.message || "Failed to load profile requirements";
    dispatch(PROFILE_REQUIREMENTS_FAIL(errorMessage));
    if (!isMembershipBlockedResponse(err)) {
      dispatch(setAlert(errorMessage, "danger"));
    }
    return null;
  }
};
export const getUserProfile = () => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(PROFILE_REQUEST());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.get(`/api/users/profile`, config);

    if (res.data.status === true) {
      dispatch(PROFILE_SUCCESS(res.data.response));
      return res.data.response;
    } else {
      const errors = res.data.errors;
      if (errors) {
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      const errorMessage = res.data.message || "Failed to load profile";
      dispatch(PROFILE_FAIL(errorMessage));
      dispatch(setAlert(errorMessage, "danger"));
      return null;
    }
  } catch (err) {
    console.error("Error fetching profile:", err);
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    const errorMessage = err.response?.data?.message || "Failed to load profile";
    dispatch(PROFILE_FAIL(errorMessage));
    if (!isMembershipBlockedResponse(err)) {
      dispatch(setAlert(errorMessage, "danger"));
    }
    return null;
  }
};

/**
 * Update user profile (User + UserDetails)
 */
export const updateUserProfile = (formData) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    dispatch(removeAlert());
    dispatch(PROFILE_REQUEST());

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const res = await api.put(`/api/users/profile`, formData, config);

    if (res.data.status === true) {
      dispatch(PROFILE_UPDATE_SUCCESS(res.data.response));
      dispatch(setAlert("Profile updated successfully", "success"));
      return res.data.response;
    } else {
      const errors = res.data.errors;
      if (errors) {
        dispatch(setAlert(res.data.message || "Validation failed", "danger"));
        errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(PROFILE_FAIL(res.data.message || "Failed to update profile"));
      return null;
    }
  } catch (err) {
    console.error("Error updating profile:", err);
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    const errorMessage = err.response?.data?.message || "Failed to update profile";
    dispatch(PROFILE_FAIL(errorMessage));
    dispatch(setAlert(errorMessage, "danger"));
    return null;
  }
};
