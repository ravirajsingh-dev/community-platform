import {
  servicesListUpdated,
  productsListUpdated,
  productServicesListUpdated,
  productServiceCategoriesListUpdated,
  loadingOnGenerateQRCode,
  generateQRCodeUpdated,
  adminPrimeCredentialListUpdated,
  adminDetailsUpdated,
  userDashboardDetailsUpdated,
  sevaKendraUpdated,
  loadingSevaKendra,
  commonSettingsUpdated,
  commonSettingsLoadFailed,
  loadingCommonSettings,
} from "@reducers/commonReducer";
import { removeErrors } from "@src/reducers/errors";
import { removeAlertMsg } from "@src/reducers/alert";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import api from "@src/utils/axiosSetup";

export const getServicesList = () => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(`/api/common/services-list`, config);

    dispatch(servicesListUpdated(res.data.response));
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(logout());
    }
  }
};

export const getSevaKendrasList = () => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };

    dispatch(loadingSevaKendra());

    const res = await api.get(`/api/common/seva-kendra`, config);

    dispatch(sevaKendraUpdated(res.data.response[0]));
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(logout());
    }
  }
};

export const getDashboardStash = (user_id) => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(`/api/common/dashboard-stash/${user_id}`, config);

    dispatch(userDashboardDetailsUpdated(res.data.response));
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(logout());
    }
  }
};

export const getProductsList = () => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(`/api/common/products-list`, config);

    dispatch(productsListUpdated(res.data.response));
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(logout());
    }
  }
};

export const getProductServicesListByID = (product_id) => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(
      `/api/common/product-services/${product_id}/list-full`,
      config
    );

    dispatch(productServicesListUpdated(res.data.response));
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(logout());
    }
  }
};

export const getProductServiceCategoriesListByID =
  (product_service_id) => async (dispatch) => {
    try {
      const config = { headers: { "Content-Type": "application/json" } };

      const res = await api.get(
        `/api/common/services-categories/${product_service_id}`,
        config
      );

      dispatch(productServiceCategoriesListUpdated(res.data.response));
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response?.data && err.response.data.tokenStatus === 0) {
        dispatch(logout());
      }
    }
  };

export const getAdminDetails = () => async (dispatch) => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };

    const res = await api.get(`/api/common/admin/details`, config);

    dispatch(adminDetailsUpdated(res.data.response));
    return res.data ? res.data : { status: false };
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(logout());
    }
  }
};

export const getCommonSettings = () => async (dispatch) => {
  try {
    dispatch(loadingCommonSettings());
    const config = {
      headers: { "Content-Type": "application/json" },
      allowDuplicates: true,
    };

    const res = await api.get(`/api/common/settings`, config);

    if (res.data?.status === true) {
      dispatch(commonSettingsUpdated(res.data.response));
    } else {
      dispatch(commonSettingsLoadFailed());
    }
    return res.data ? res.data : { status: false };
  } catch (err) {
    dispatch(commonSettingsLoadFailed());
    return { status: false };
  }
};

/**
 * Active communities for public registration (no auth required).
 * Returns { data: [{ value, label, status }] } for CustomSelect.
 */
export const fetchPublicCommunities = () => async () => {
  try {
    const res = await api.get("/api/common/communities");
    if (res.data?.status === true && Array.isArray(res.data.response)) {
      return { data: res.data.response };
    }
    return { data: [] };
  } catch (err) {
    console.error("Error fetching public communities:", err);
    return { data: [] };
  }
};

export const removeAllErrors = () => async (dispatch) => {
  dispatch(removeErrors());
  dispatch(removeAlertMsg());
};
