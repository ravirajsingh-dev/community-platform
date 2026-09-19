import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  membershipPlansUpdated,
  loadingMembershipPlans,
  loadingOnMembershipPlanSubmit,
  membershipPlanSubmitSuccess,
} from "@reducers/adminMembershipPlanReducer";

const getApiErrorMessage = (data, fallback) => {
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((error) => error.msg).filter(Boolean).join(". ");
  }
  return data?.message || fallback;
};

const normalizePlansResponse = (response) => {
  const payload = response?.[0] || response;
  const metadata = payload?.metadata?.[0] || {};
  return {
    data: payload?.data || [],
    pagination: {
      page: metadata.current_page || 1,
      limit: metadata.per_page || 50,
      total: metadata.totalRecord || 0,
      pages: metadata.per_page
        ? Math.ceil((metadata.totalRecord || 0) / metadata.per_page)
        : 0,
    },
  };
};

export const getMembershipPlans =
  (params = {}) =>
  async (dispatch) => {
    try {
      dispatch(loadingMembershipPlans());
      const res = await api.get("/api/admin/membership-plans", { params });
      if (res.data?.status) {
        dispatch(membershipPlansUpdated(normalizePlansResponse(res.data.response)));
      }
      return res.data || { status: false };
    } catch (err) {
      if (err.response?.data?.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        dispatch(
          setAlert(
            err.response?.data?.message || "Error fetching membership plans",
            "danger",
          ),
        );
      }
      return { status: false };
    }
  };

export const createMembershipPlan = (formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnMembershipPlanSubmit());
  try {
    const res = await api.post("/api/admin/membership-plans", formData);
    dispatch(membershipPlanSubmitSuccess());
    if (res.data?.status) {
      dispatch(setAlert("Membership plan created successfully", "success"));
      dispatch(getMembershipPlans({ limit: 50, page: 1 }));
      return res.data;
    }
    if (res.data?.errors) {
      res.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Error creating membership plan"), "danger"),
    );
    return { status: false };
  } catch (err) {
    dispatch(membershipPlanSubmitSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response?.data?.errors?.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      dispatch(
        setAlert(
          getApiErrorMessage(err.response?.data, "Error creating membership plan"),
          "danger",
        ),
      );
    }
    return { status: false };
  }
};

export const updateMembershipPlan = (id, formData) => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(loadingOnMembershipPlanSubmit());
  try {
    const res = await api.put(`/api/admin/membership-plans/${id}`, formData);
    dispatch(membershipPlanSubmitSuccess());
    if (res.data?.status) {
      dispatch(setAlert("Membership plan updated successfully", "success"));
      dispatch(getMembershipPlans({ limit: 50, page: 1 }));
      return res.data;
    }
    if (res.data?.errors) {
      res.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Error updating membership plan"), "danger"),
    );
    return { status: false };
  } catch (err) {
    dispatch(membershipPlanSubmitSuccess());
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response?.data?.errors?.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      dispatch(
        setAlert(
          getApiErrorMessage(err.response?.data, "Error updating membership plan"),
          "danger",
        ),
      );
    }
    return { status: false };
  }
};

export const deleteMembershipPlan = (id, txnPassword) => async (dispatch) => {
  try {
    const res = await api.delete(`/api/admin/membership-plans/${id}`, {
      data: { txn_password: txnPassword },
    });
    if (res.data?.status) {
      dispatch(setAlert(res.data.message || "Membership plan deleted", "success"));
      dispatch(getMembershipPlans({ limit: 50, page: 1 }));
      return res.data;
    }
    dispatch(
      setAlert(getApiErrorMessage(res.data, "Error deleting membership plan"), "danger"),
    );
    return { status: false };
  } catch (err) {
    if (err.response?.data?.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        setAlert(
          getApiErrorMessage(err.response?.data, "Error deleting membership plan"),
          "danger",
        ),
      );
    }
    return { status: false };
  }
};
