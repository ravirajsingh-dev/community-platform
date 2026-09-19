import axios from "axios";
import store from "@src/store";
import { logoutAdminAuth, adminAuthTokenRefresh } from "@src/reducers/adminAuth";

// Create a dedicated axios instance for the admin app
const api = axios.create({
  withCredentials: true, // Automatically send cookies with requests
});

// Track ongoing requests to avoid duplicates
const ongoingRequests = new Map();

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

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const requestKey = getRequestKey(config);

    // Prevent duplicate requests unless explicitly allowed
    if (!config.allowDuplicates && ongoingRequests.has(requestKey)) {
      return Promise.reject(new Error("Duplicate request in progress"));
    }

    // Attach a cancel token to each request
    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    ongoingRequests.set(requestKey, source);

    // Ensure credentials are included (cookies will be sent automatically)
    config.withCredentials = true;

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor (mirrors client axiosSetup.js behavior, with admin endpoint)
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

    // Handle unauthorized errors by attempting token refresh
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Admin-specific refresh token endpoint
        // Cookies will be sent automatically via withCredentials
        const endpoint = `/api/auth/admin/refresh-token`;
        const response = await axios.post(endpoint, {}, {
          withCredentials: true,
        });

        // Only update admin state when response contains a valid admin object.
        // Backend refresh returns success with empty response {}; do not treat that as auth failure.
        const payload = response.data?.response;
        const admin =
          payload &&
          typeof payload === "object" &&
          !Array.isArray(payload)
            ? payload.admin ?? payload
            : undefined;
        if (admin != null && typeof admin === "object") {
          dispatch(adminAuthTokenRefresh({ admin }));
        }

        // Retry the original request with a fresh cancel token
        const retrySource = axios.CancelToken.source();
        originalRequest.cancelToken = retrySource.token;
        originalRequest.withCredentials = true;
        ongoingRequests.set(getRequestKey(originalRequest), retrySource);

        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout user
        dispatch(logoutAdminAuth());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
