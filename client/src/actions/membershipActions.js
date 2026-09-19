import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import {
  loadingMembershipPlans,
  membershipPlansUpdated,
  membershipPlansError,
  loadingOnCreateOrder,
  createOrderSuccess,
  createOrderFail,
  loadingPaymentStatus,
  paymentStatusUpdated,
  paymentStatusError,
  loadingCurrentMembership,
  currentMembershipUpdated,
  currentMembershipError,
  loadingMembershipPayments,
  membershipPaymentsUpdated,
  membershipPaymentsError,
} from "@reducers/membershipReducer";

export const fetchMembershipPlans = () => async (dispatch) => {
  try {
    dispatch(loadingMembershipPlans());
    const res = await api.get("/api/common/membership-plans", {
      allowDuplicates: true,
    });
    if (res.data?.status) {
      dispatch(membershipPlansUpdated(res.data.response || []));
      return res.data;
    }
    dispatch(membershipPlansError(res.data?.message || "Failed to load plans"));
    return res.data || { status: false };
  } catch (err) {
    const message =
      err.response?.data?.message || "Failed to load membership plans";
    dispatch(membershipPlansError(message));
    return { status: false, message };
  }
};

export const createPaymentOrder = ({ userId, planId }) => async (dispatch) => {
  dispatch(loadingOnCreateOrder());
  try {
    const res = await api.post("/api/payments/create-order", { userId, planId });
    dispatch(createOrderSuccess());
    if (res.data?.status) {
      return res.data;
    }
    dispatch(
      setAlert(res.data?.message || "Failed to create payment order", "danger"),
    );
    return res.data || { status: false };
  } catch (err) {
    dispatch(createOrderFail());
    const message =
      err.response?.data?.message || "Failed to create payment order";
    const isDuplicate =
      /already active|lifetime membership/i.test(message);
    dispatch(
      setAlert(
        isDuplicate
          ? "Your membership is already active. No payment is required."
          : message,
        isDuplicate ? "info" : "danger",
      ),
    );
    return err.response?.data || { status: false, message };
  }
};

export const fetchPaymentStatus =
  (orderId, { fromReturn = false } = {}) =>
  async (dispatch) => {
    dispatch(loadingPaymentStatus());
    try {
      const res = await api.get(`/api/payments/status/${orderId}`, {
        params: fromReturn ? { fromReturn: "true" } : undefined,
      });
      if (res.data?.status) {
        dispatch(paymentStatusUpdated(res.data.response));
        return res.data;
      }
      dispatch(paymentStatusError());
      return res.data || { status: false };
    } catch (err) {
      dispatch(paymentStatusError());
      const message =
        err.response?.data?.message || "Failed to verify payment status";
      return { status: false, message };
    }
  };

export const fetchCurrentMembership = () => async (dispatch) => {
  dispatch(loadingCurrentMembership());
  try {
    const res = await api.get("/api/users/membership", {
      allowDuplicates: true,
    });
    if (res.data?.status) {
      dispatch(currentMembershipUpdated(res.data.response));
      return res.data;
    }
    dispatch(
      currentMembershipError(res.data?.message || "Failed to load membership"),
    );
    return res.data || { status: false };
  } catch (err) {
    const message =
      err.response?.data?.message || "Failed to load membership details";
    dispatch(currentMembershipError(message));
    return { status: false, message };
  }
};

export const fetchMembershipPayments = (params) => async (dispatch) => {
  dispatch(loadingMembershipPayments());
  try {
    const res = await api.get("/api/users/membership/payments", {
      params,
      allowDuplicates: true,
    });
    if (res.data?.status) {
      const { data = [], pagination = {} } = res.data.response || {};
      dispatch(
        membershipPaymentsUpdated({
          data,
          count: pagination.total || 0,
        }),
      );
      return res.data;
    }
    dispatch(
      membershipPaymentsError(
        res.data?.message || "Failed to load payment history",
      ),
    );
    return res.data || { status: false };
  } catch (err) {
    const message =
      err.response?.data?.message || "Failed to load payment history";
    dispatch(membershipPaymentsError(message));
    return { status: false, message };
  }
};

export const createRenewalOrder = (planId) => async (dispatch) => {
  dispatch(loadingOnCreateOrder());
  try {
    const res = await api.post("/api/users/membership/renew", { planId });
    dispatch(createOrderSuccess());
    if (res.data?.status) {
      return res.data;
    }
    dispatch(
      setAlert(res.data?.message || "Failed to create renewal order", "danger"),
    );
    return res.data || { status: false };
  } catch (err) {
    dispatch(createOrderFail());
    const message =
      err.response?.data?.message || "Failed to create renewal order";
    const isDuplicate =
      /already active|lifetime membership/i.test(message);
    dispatch(
      setAlert(
        isDuplicate
          ? "Your membership is already active. No renewal payment is required."
          : message,
        isDuplicate ? "info" : "danger",
      ),
    );
    return err.response?.data || { status: false, message };
  }
};
