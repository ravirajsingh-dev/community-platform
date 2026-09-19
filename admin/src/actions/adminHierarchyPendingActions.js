import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/actions/alert";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "@src/actions/adminAuth";
import {
  hierarchyPendingError,
  hierarchyPendingListUpdated,
  hierarchyPendingSearchParameterUpdate,
  loadingHierarchyPendingList,
  resetHierarchyPending,
} from "@src/reducers/adminHierarchyPendingReducer";

const paramsSerializer = {
  serialize: (params) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
        searchParams.append(key, params[key]);
      }
    });
    return searchParams.toString();
  },
};

const HIERARCHY_LEVEL_API_PATHS = {
  community: "/api/admin/communities",
  vansh: "/api/admin/vansh",
  kul: "/api/admin/kul",
  khamp: "/api/admin/khamp",
  gotra: "/api/admin/gotra",
};

function handleApiError(dispatch, err, fallbackMessage) {
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(adminLogout());
    return;
  }

  if (err.response) {
    dispatch(
      hierarchyPendingError({
        msg: err.response.statusText,
        status: err.response.status,
      }),
    );
    dispatch(
      setAlert(err.response?.data?.message || fallbackMessage, "danger"),
    );
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
  }
}

export const getPendingApprovalsList = (listParams) => async (dispatch) => {
  try {
    dispatch(loadingHierarchyPendingList());

    const res = await api.get("/api/admin/hierarchy/pending", {
      params: listParams,
      paramsSerializer,
    });

    if (res.data?.status && res.data.response && res.data.response[0]) {
      dispatch(hierarchyPendingSearchParameterUpdate(listParams));
      dispatch(hierarchyPendingListUpdated(res.data.response[0]));
    } else if (res.data?.status === false) {
      const errorMsg = res.data.message || "Error fetching pending approvals";
      dispatch(hierarchyPendingError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    handleApiError(dispatch, err, "Error fetching pending approvals");
  }
};

export const approvePendingItem = (level, id) => async (dispatch) => {
  try {
    const apiPath = HIERARCHY_LEVEL_API_PATHS[level];
    if (!apiPath) {
      dispatch(setAlert("Invalid hierarchy level", "danger"));
      return { status: false };
    }

    const res = await api.put(
      `${apiPath}/${id}/approve`,
      {},
      { headers: { "Content-Type": "application/json" } },
    );

    if (res.data.status === true) {
      dispatch(
        setAlert(
          res.data.message || "Pending item approved successfully",
          "success",
        ),
      );
    }
    return res.data ?? { status: false };
  } catch (err) {
    handleApiError(dispatch, err, "Error approving pending item");
    return { status: false };
  }
};

export const rejectPendingItem = (level, id) => async (dispatch) => {
  try {
    const apiPath = HIERARCHY_LEVEL_API_PATHS[level];
    if (!apiPath) {
      dispatch(setAlert("Invalid hierarchy level", "danger"));
      return { status: false };
    }

    const res = await api.put(
      `${apiPath}/${id}/reject`,
      {},
      { headers: { "Content-Type": "application/json" } },
    );

    if (res.data.status === true) {
      dispatch(
        setAlert(
          res.data.message || "Pending item rejected successfully",
          "success",
        ),
      );
    }
    return res.data ?? { status: false };
  } catch (err) {
    handleApiError(dispatch, err, "Error rejecting pending item");
    return { status: false };
  }
};

export const bulkApprovePendingItems = (items) => async (dispatch) => {
  try {
    dispatch(removeErrors());
    const res = await api.put(
      "/api/admin/hierarchy/pending/bulk-approve",
      { items },
      { headers: { "Content-Type": "application/json" } },
    );

    if (res.data.status === true) {
      const { summary } = res.data.response || {};
      const count = summary?.approved ?? items.length;
      dispatch(
        setAlert(
          res.data.message ||
            `${count} pending item(s) approved successfully`,
          "success",
        ),
      );
    }
    return res.data ?? { status: false };
  } catch (err) {
    handleApiError(dispatch, err, "Error bulk approving pending items");
    return { status: false };
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetHierarchyPending());
};
