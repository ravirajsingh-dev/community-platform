import api from "@src/utils/axiosSetup";
import {
  loadingWallet,
  walletUpdated,
  walletError,
  loadingReferrals,
  referralsUpdated,
  referralsError,
} from "@reducers/walletReducer";

export const fetchWallet =
  (params = {}) =>
  async (dispatch) => {
    dispatch(loadingWallet());
    try {
      const res = await api.get("/api/users/wallet", {
        params,
        allowDuplicates: true,
      });
      if (res.data?.status) {
        dispatch(walletUpdated(res.data.response));
        return res.data;
      }
      dispatch(walletError(res.data?.message || "Failed to load wallet"));
      return res.data || { status: false };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load wallet";
      dispatch(walletError(message));
      return { status: false, message };
    }
  };

export const fetchDirectReferrals =
  (params = {}) =>
  async (dispatch) => {
    dispatch(loadingReferrals());
    try {
      const res = await api.get("/api/users/referrals", {
        params,
        allowDuplicates: true,
      });
      if (res.data?.status) {
        dispatch(referralsUpdated(res.data.response));
        return res.data;
      }
      dispatch(
        referralsError(res.data?.message || "Failed to load referrals"),
      );
      return res.data || { status: false };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load referrals";
      dispatch(referralsError(message));
      return { status: false, message };
    }
  };

/**
 * Create a new member using wallet balance (plan activated immediately).
 */
export const createUserFromWallet = (payload) => async () => {
  try {
    const res = await api.post("/api/users/wallet/create-user", payload);
    return res.data;
  } catch (err) {
    return {
      status: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        "Failed to create user from wallet",
      errors: err.response?.data?.errors,
      data: err.response?.data,
    };
  }
};
