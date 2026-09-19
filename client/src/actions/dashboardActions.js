// dashboardActions.js
import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { logout } from "./auth";

import {
  dashboardError,
  resetDashboardStates,
} from "@reducers/dashboardReducer";

// Reset Dashboard State
export const resetDashboardState = () => async (dispatch) => {
  await dispatch(resetDashboardStates());
};

// Handle Errors
const handleErrors = (res, dispatch) => {
  const errors = res.data.errors;
  if (errors) {
    dispatch(dashboardError());
    dispatch(setAlert(res.data.message, "danger"));
    errors.forEach((error) => {
      dispatch(setErrorsList(error.msg, error.path));
    });
  }
};

// Handle Request Errors
const handleRequestError = (err, dispatch) => {
  console.error("Error fetching total user count:", err);
  if (
    err.response &&
    err.response.data &&
    err.response.data.tokenStatus === 0
  ) {
    dispatch(logout());
  } else {
    err.response &&
      dispatch(
        dashboardError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response.message, "danger"));
  }
};
