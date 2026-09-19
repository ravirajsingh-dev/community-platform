import axios from "axios";
import store from "@src/store";
import { logoutAuth, authTokenRefresh } from "@src/reducers/auth";
import { setAlert } from "@src/actions/alert";
import { isPaymentReturnUrl } from "@src/utils/paymentReturnHelper";

const api = axios.create();

// Configure axios to send cookies automatically
axios.defaults.withCredentials = true;
api.defaults.withCredentials = true;

const ongoingRequests = new Map();
let refreshPromise = null;
let isLoggingOut = false;

const getRequestKey = (config) => {
  if (!config) return "";
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join("&");
};

const removeRequest = (requestKey) => {
  if (ongoingRequests.has(requestKey)) {
    ongoingRequests.delete(requestKey);
  }
};

const shouldSkipTokenRefresh = (config) => {
  if (!config) return false;
  if (config.skipAuthRefresh) return true;

  const url = config.url || "";
  return (
    url.includes("/api/auth/load-user") ||
    url.includes("/api/auth/refresh-token")
  );
};

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const requestKey = getRequestKey(config);

    // Check for duplicate request unless explicitly allowed
    if (!config.allowDuplicates && ongoingRequests.has(requestKey)) {
      return Promise.reject(new Error("Duplicate request in progress"));
    }

    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    ongoingRequests.set(requestKey, source);

    // Cookies are automatically sent via withCredentials = true
    // No manual header setting required

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    const requestKey = getRequestKey(response.config);
    removeRequest(requestKey);
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;
    const { dispatch } = store;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestKey = getRequestKey(originalRequest);
    removeRequest(requestKey);

    // Token expired - attempt to refresh (single in-flight to avoid concurrent refreshes)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      if (shouldSkipTokenRefresh(originalRequest)) {
        return Promise.reject(error);
      }

      const wasAuthenticated =
        store.getState().auth?.isAuthenticated === true;
      originalRequest._retry = true;

      try {
        const endpoint = `/api/auth/refresh-token`;
        if (!refreshPromise) {
          refreshPromise = axios
            .post(endpoint, {}, { withCredentials: true })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const response = await refreshPromise;

        if (response.data?.status === true) {
          isLoggingOut = false;
          dispatch(authTokenRefresh({}));

          const retrySource = axios.CancelToken.source();
          originalRequest.cancelToken = retrySource.token;
          ongoingRequests.set(getRequestKey(originalRequest), retrySource);

          return api(originalRequest);
        }

        if (!isLoggingOut && wasAuthenticated) {
          isLoggingOut = true;
          if (!isPaymentReturnUrl(window.location.search)) {
            dispatch(
              setAlert(
                "Your session expired. Please log in again.",
                "warning",
              ),
            );
          }
          dispatch(logoutAuth());
        }
        return Promise.reject(new Error("Token refresh failed"));
      } catch (refreshError) {
        const refreshStatus = refreshError?.response?.status;
        const hadSession = refreshStatus !== 400;

        if (!isLoggingOut && wasAuthenticated && hadSession) {
          isLoggingOut = true;
          if (!isPaymentReturnUrl(window.location.search)) {
            dispatch(
              setAlert(
                "Your session expired. Please log in again.",
                "warning",
              ),
            );
          }
          dispatch(logoutAuth());
        }
        console.error("Token refresh failed:", refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
