import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { adminLogout } from "./adminAuth";
import {
  paymentsUpdated,
  loadingPayments,
  paymentUpdated,
  loadingPaymentDetail,
  paymentStatsUpdated,
  loadingPaymentStats,
} from "@reducers/adminPaymentsReducer";

export const getPayments =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingPayments());
      const res = await api.get("/api/admin/payments", { params });
      if (res.data?.status) {
        dispatch(paymentsUpdated(res.data.response));
      }
      return res.data || { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching payments",
            "danger",
          ),
        );
      }
      return { status: false };
    }
  };

export const getPaymentById = (id) => async (dispatch) => {
  try {
    dispatch(loadingPaymentDetail());
    const res = await api.get(`/api/admin/payments/${id}`);
    if (res.data?.status) {
      dispatch(paymentUpdated(res.data.response));
      return res.data.response;
    }
    dispatch(paymentUpdated(null));
    return null;
  } catch (err) {
    dispatch(paymentUpdated(null));
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          err.response?.data?.message || "Error fetching payment details",
          "danger",
        ),
      );
    }
    return null;
  }
};

export const getPaymentStats = () => async (dispatch) => {
  try {
    dispatch(loadingPaymentStats());
    const res = await api.get("/api/admin/payments/stats");
    if (res.data?.status) {
      dispatch(paymentStatsUpdated(res.data.response));
    }
    return res.data || { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    }
    return { status: false };
  }
};

export const updatePaymentStatus =
  (id, { status, remarks, txn_password }) =>
  async (dispatch) => {
    try {
      const res = await api.put(`/api/admin/payments/${id}/status`, {
        status,
        remarks,
        txn_password,
      });
      if (res.data?.status) {
        dispatch(
          setAlert(
            res.data.message || "Payment status updated successfully",
            "success",
          ),
        );
        return res.data;
      }
      dispatch(
        setAlert(res.data?.message || "Failed to update payment status", "danger"),
      );
      return res.data || { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Failed to update payment status",
            "danger",
          ),
        );
      }
      return err.response?.data || { status: false };
    }
  };
