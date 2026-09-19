import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { adminLogout } from "./adminAuth";
import {
  walletsUpdated,
  loadingWallets,
  transactionsUpdated,
  loadingTransactions,
  adminAdjustmentsUpdated,
  loadingAdminAdjustments,
  adjustingWallet,
  adjustWalletDone,
} from "@reducers/adminWalletsReducer";

export const getWallets =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingWallets());
      const res = await api.get("/api/admin/wallets", { params });
      if (res.data?.status) {
        dispatch(walletsUpdated(res.data.response));
      }
      return res.data || { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching wallets",
            "danger",
          ),
        );
      }
      return { status: false };
    }
  };

export const getWalletTransactions =
  (userId, params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingTransactions());
      const res = await api.get(
        `/api/admin/wallets/users/${userId}/transactions`,
        { params, allowDuplicates: true },
      );
      if (res.data?.status) {
        dispatch(transactionsUpdated(res.data.response));
        return res.data.response;
      }
      dispatch(
        transactionsUpdated({
          wallet: null,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        }),
      );
      return null;
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching wallet history",
            "danger",
          ),
        );
      }
      return null;
    }
  };

export const resolveWalletMember =
  (memberId) => async (dispatch) => {
    try {
      const res = await api.get("/api/admin/wallets/resolve-member", {
        params: { memberId },
        allowDuplicates: true,
      });
      return res.data || { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      }
      return (
        err.response?.data || {
          status: false,
          message: "Failed to resolve member",
        }
      );
    }
  };

export const getAdminAdjustments =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingAdminAdjustments());
      const res = await api.get("/api/admin/wallets/admin-adjustments", {
        params,
        allowDuplicates: true,
      });
      if (res.data?.status) {
        dispatch(adminAdjustmentsUpdated(res.data.response));
        return res.data.response;
      }
      dispatch(
        adminAdjustmentsUpdated({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        }),
      );
      return null;
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching admin adjustments",
            "danger",
          ),
        );
      }
      dispatch(
        adminAdjustmentsUpdated({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        }),
      );
      return null;
    }
  };

export const adjustWalletBalance =
  (userId, { type, amount, remarks, txn_password }) =>
  async (dispatch) => {
    try {
      dispatch(adjustingWallet());
      const res = await api.post(`/api/admin/wallets/users/${userId}/adjust`, {
        type,
        amount,
        remarks,
        txn_password,
      });
      dispatch(adjustWalletDone());
      if (res.data?.status) {
        dispatch(
          setAlert(
            res.data.message || "Wallet adjusted successfully",
            "success",
          ),
        );
        return res.data;
      }
      dispatch(
        setAlert(res.data?.message || "Failed to adjust wallet", "danger"),
      );
      return res.data || { status: false };
    } catch (err) {
      dispatch(adjustWalletDone());
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Failed to adjust wallet",
            "danger",
          ),
        );
      }
      return err.response?.data || { status: false };
    }
  };
