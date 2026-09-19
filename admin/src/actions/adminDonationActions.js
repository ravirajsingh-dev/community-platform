import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  donationButtonsUpdated,
  loadingDonationButtons,
  donationRequestsUpdated,
  loadingDonationRequests,
  donationRequestUpdated,
  loadingOnDonationButtonSubmit,
  donationButtonSubmitSuccess,
  donationSettingsUpdated,
  loadingDonationSettings,
  loadingOnDonationSettingsSubmit,
  donationSettingsSubmitSuccess,
  loadingOnDonationRequestAction,
  donationRequestActionSuccess,
} from "@reducers/adminDonationReducer";

/**
 * Get donation settings
 */
export const getDonationSettings = () => async (dispatch) => {
  try {
    dispatch(loadingDonationSettings());
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(`/api/admin/donation/settings`, config);

    if (res.data && res.data.status === true) {
      dispatch(donationSettingsUpdated(res.data.response));
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error fetching donation settings",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Update donation settings
 */
export const updateDonationSettings = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnDonationSettingsSubmit());
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.put(
      `/api/admin/donation/settings`,
      formData,
      config
    );

    if (res.data && res.data.status === true) {
      dispatch(donationSettingsSubmitSuccess());
      dispatch(donationSettingsUpdated(res.data.response));
      dispatch(setAlert("Donation settings updated successfully", "success"));
      return res.data;
    }

    dispatch(donationSettingsSubmitSuccess());
    if (res.data.errors) {
      res.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(
      setAlert(res.data.message || "Error updating donation settings", "danger")
    );
    return { status: false };
  } catch (err) {
    dispatch(donationSettingsSubmitSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(
          err.response?.data?.message || "Error updating donation settings",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Get all donation buttons
 */
export const getDonationButtons =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingDonationButtons());
      const config = { headers: { "Content-Type": "application/json" } };

      const res = await api.get(`/api/admin/donation/buttons`, config);

      if (res.data && res.data.status === true) {
        dispatch(donationButtonsUpdated(res.data.response));
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching donation buttons",
            "danger"
          )
        );
      }
      return { status: false };
    }
  };

/**
 * Create donation button
 */
export const createDonationButton = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnDonationButtonSubmit());
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.post(`/api/admin/donation/buttons`, formData, config);

    if (res.data && res.data.status === true) {
      dispatch(donationButtonSubmitSuccess());
      dispatch(setAlert("Donation button created successfully", "success"));
      dispatch(getDonationButtons());
      return res.data;
    } else {
      dispatch(donationButtonSubmitSuccess());
      if (res.data.errors) {
        res.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(res.data.message || "Error creating donation button", "danger")
      );
      return { status: false };
    }
  } catch (err) {
    dispatch(donationButtonSubmitSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(
          err.response?.data?.message || "Error creating donation button",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Update donation button
 */
export const updateDonationButton = (id, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnDonationButtonSubmit());
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    // Extract txn_password from formData if present
    const { txn_password, ...buttonData } = formData;
    const requestData = { ...buttonData };
    if (txn_password) {
      requestData.txn_password = txn_password;
    }
    const res = await api.put(
      `/api/admin/donation/buttons/${id}`,
      requestData,
      config
    );

    if (res.data && res.data.status === true) {
      dispatch(donationButtonSubmitSuccess());
      dispatch(setAlert("Donation button updated successfully", "success"));
      dispatch(getDonationButtons());
      return res.data;
    } else {
      dispatch(donationButtonSubmitSuccess());
      if (res.data.errors) {
        res.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(res.data.message || "Error updating donation button", "danger")
      );
      return { status: false };
    }
  } catch (err) {
    dispatch(donationButtonSubmitSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      if (err.response?.data?.errors) {
        err.response.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      dispatch(
        setAlert(
          err.response?.data?.message || "Error updating donation button",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Delete donation button
 */
export const deleteDonationButton = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: { "Content-Type": "application/json" },
      data: {
        txn_password: txn_password,
      },
    };
    const res = await api.delete(`/api/admin/donation/buttons/${id}`, config);

    if (res.data && res.data.status === true) {
      dispatch(setAlert("Donation button deleted successfully", "success"));
      dispatch(getDonationButtons());
      return res.data;
    } else {
      dispatch(
        setAlert(res.data.message || "Error deleting donation button", "danger")
      );
      return { status: false };
    }
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error deleting donation button",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Get all donation requests with filters
 */
export const getDonationRequests =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingDonationRequests());
      const config = {
        headers: { "Content-Type": "application/json" },
        params: params,
      };

      const res = await api.get(`/api/admin/donation/requests`, config);

      if (res.data && res.data.status === true) {
        dispatch(donationRequestsUpdated(res.data.response));
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching donation requests",
            "danger"
          )
        );
      }
      return { status: false };
    }
  };

/**
 * Get single donation request
 */
export const getDonationRequest = (id) => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/admin/donation/requests/${id}`, config);

    if (res.data && res.data.status === true) {
      dispatch(donationRequestUpdated(res.data.response));
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error fetching donation request",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Approve donation request
 */
export const approveDonationRequest = (id, txn_password) => async (dispatch) => {
  dispatch(loadingOnDonationRequestAction());
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.put(
      `/api/admin/donation/requests/${id}/approve`,
      { txn_password },
      config
    );

    if (res.data && res.data.status === true) {
      dispatch(donationRequestActionSuccess());
      dispatch(setAlert("Donation request approved successfully", "success"));
      return res.data;
    }

    dispatch(donationRequestActionSuccess());
    dispatch(
      setAlert(res.data.message || "Error approving donation request", "danger")
    );
    return { status: false };
  } catch (err) {
    dispatch(donationRequestActionSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error approving donation request",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

/**
 * Reject donation request
 */
export const rejectDonationRequest =
  (id, txn_password, rejectionReason) => async (dispatch) => {
  dispatch(loadingOnDonationRequestAction());
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.put(
      `/api/admin/donation/requests/${id}/reject`,
      { txn_password, rejectionReason },
      config
    );

    if (res.data && res.data.status === true) {
      dispatch(donationRequestActionSuccess());
      dispatch(setAlert("Donation request rejected successfully", "success"));
      return res.data;
    }

    dispatch(donationRequestActionSuccess());
    dispatch(
      setAlert(res.data.message || "Error rejecting donation request", "danger")
    );
    return { status: false };
  } catch (err) {
    dispatch(donationRequestActionSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error rejecting donation request",
          "danger"
        )
      );
    }
    return { status: false };
  }
};

