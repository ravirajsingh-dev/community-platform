import api from "@src/utils/axiosSetup";
import { setAlert } from "@src/actions/alert";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "@src/actions/adminAuth";

const paramsSerializer = {
  serialize: (params) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined) {
        searchParams.append(key, params[key]);
      }
    });
    return searchParams.toString();
  },
};

function handleApiError(dispatch, err, reducers, fallbackMessage) {
  if (err.response?.data?.tokenStatus === 0) {
    dispatch(adminLogout());
    return;
  }

  if (err.response) {
    if (reducers.finishLoading) {
      dispatch(reducers.finishLoading());
    }
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

/**
 * Factory for admin hierarchy entity Redux actions (Village pattern).
 */
export function createAdminEntityActions(config) {
  const {
    apiPath,
    label,
    entityLabel: configEntityLabel,
    reducers,
    exportNames,
  } = config;
  const entityLabel = configEntityLabel || label || "Item";

  const list = (listParams) => async (dispatch) => {
    try {
      const query = listParams.query ? listParams.query : {};
      listParams.query = query;

      dispatch(reducers.loadingList());

      const res = await api.get(apiPath, {
        "Content-Type": "application/json",
        params: listParams,
        paramsSerializer,
      });

      if (
        res.data?.status &&
        res.data.response &&
        res.data.response[0]
      ) {
        dispatch(reducers.listUpdated(res.data.response[0]));
      } else if (res.data?.status === false) {
        const errorMsg = res.data.message || `Error fetching ${entityLabel}`;
        if (reducers.finishLoading) {
          dispatch(reducers.finishLoading());
        }
        dispatch(setAlert(errorMsg, "danger"));
      }
    } catch (err) {
      handleApiError(
        dispatch,
        err,
        reducers,
        `Error fetching ${entityLabel}`,
      );
    }
  };

  const getById = (id) => async (dispatch) => {
    try {
      if (reducers.loadingEntity) {
        dispatch(reducers.loadingEntity());
      }
      const res = await api.get(`${apiPath}/${id}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.data.status === true) {
        dispatch(reducers.detailsById(res.data.response));
      }
      return res.data?.response ?? null;
    } catch (err) {
      handleApiError(
        dispatch,
        err,
        reducers,
        `Error fetching ${entityLabel}`,
      );
      return null;
    }
  };

  const create = (formData, navigate) => async (dispatch) => {
    try {
      dispatch(reducers.loadingSubmit());
      const res = await api.post(apiPath, formData, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.data.status === true) {
        dispatch(reducers.created(res.data.response));
        dispatch(setAlert(`${entityLabel} created successfully.`, "success"));
        if (navigate) navigate(config.listRoute);
      } else if (res.data.errors) {
        if (reducers.finishLoading) {
          dispatch(reducers.finishLoading());
        }
        dispatch(setAlert(res.data.message, "danger"));
        res.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      return res.data ?? { status: false };
    } catch (err) {
      handleApiError(
        dispatch,
        err,
        reducers,
        `Error creating ${entityLabel}`,
      );
      return { status: false };
    }
  };

  const update = (formData, id, navigate) => async (dispatch) => {
    dispatch(removeErrors());
    try {
      dispatch(reducers.loadingSubmit());
      const res = await api.put(`${apiPath}/${id}`, formData, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.data.status === true) {
        dispatch(reducers.updated(res.data.response));
        dispatch(setAlert(`${entityLabel} updated successfully.`, "success"));
        if (navigate) navigate(config.listRoute);
      } else if (res.data.errors) {
        if (reducers.finishLoading) {
          dispatch(reducers.finishLoading());
        }
        dispatch(setAlert(res.data.message, "danger"));
        res.data.errors.forEach((error) => {
          dispatch(setErrorsList(error.msg, error.path));
        });
      }
      return res.data ?? { status: false };
    } catch (err) {
      handleApiError(
        dispatch,
        err,
        reducers,
        `Error updating ${entityLabel}`,
      );
      return { status: false };
    }
  };

  const hardDelete = (id) => async (dispatch) => {
    try {
      await api.delete(`${apiPath}/${id}/hard`);
      dispatch(reducers.deleted(id));
      dispatch(
        setAlert(`${entityLabel} permanently deleted successfully`, "success"),
      );
    } catch (err) {
      handleApiError(
        dispatch,
        err,
        reducers,
        `Error permanently deleting ${entityLabel}`,
      );
    }
  };

  const resetComponentStore = () => async (dispatch) => {
    await dispatch(reducers.reset());
  };

  return {
    [exportNames.list]: list,
    [exportNames.getById]: getById,
    [exportNames.create]: create,
    [exportNames.update]: update,
    [exportNames.hardDelete]: hardDelete,
    [exportNames.resetStore]: resetComponentStore,
  };
}
