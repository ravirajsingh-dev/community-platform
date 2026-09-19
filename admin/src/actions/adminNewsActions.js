import api from "@src/utils/axiosSetup";
import { setAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  newsCreated,
  resetNews,
  newsListUpdated,
  newsUpdated,
  newsDeleted,
  newsError,
  newsSearchParameterUpdate,
  loadingOnNewsSubmit,
  loadingNewsList,
  newsDetailsById,
  loadingNews,
  newsSettingsLoaded,
  loadingNewsSettings,
  savingNewsSettings,
  newsSettingsSaved,
} from "@reducers/adminNewsReducer";

export const getNews = (newsParams) => async (dispatch) => {
  try {
    const config = {
      "Content-Type": "application/json",
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach((key) => {
            if (params[key] !== null && params[key] !== undefined) {
              searchParams.append(key, params[key]);
            }
          });
          return searchParams.toString();
        },
      },
    };

    const query = newsParams.query ? newsParams.query : {};
    newsParams.query = query;
    config.params = newsParams;

    dispatch(loadingNewsList());

    const res = await api.get(`/api/admin/news`, config);

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(newsSearchParameterUpdate(newsParams));
      dispatch(newsListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching news";
      dispatch(newsError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        newsError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg =
        err.response?.data?.message ||
        err.response?.message ||
        "Error fetching news";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getNewsById = (id) => async (dispatch) => {
  try {
    dispatch(loadingNews());
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    const res = await api.get(`/api/admin/news/${id}`, config);
    if (res.data.status === true) {
      dispatch(newsDetailsById(res.data.response));
    }
    return res.data ? res.data.response : null;
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      err.response &&
        dispatch(
          newsError({
            msg: err.response.statusText,
            status: err.response.status,
          })
        );
      dispatch(
        setAlert(err.response?.message || "Error fetching news", "danger")
      );
    }
    return null;
  }
};

export const createNews =
  (formData, navigate, { onProgress, signal } = {}) =>
  async (dispatch) => {
    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        allowDuplicates: true,
        signal,
        onUploadProgress: (event) => {
          if (!onProgress) {
            return;
          }
          if (event.total) {
            const percent = Math.min(
              100,
              Math.round((event.loaded * 100) / event.total)
            );
            onProgress(percent, event.loaded, event.total);
            return;
          }
          onProgress(null, event.loaded, event.total);
        },
      };

      dispatch(loadingOnNewsSubmit());

      const res = await api.post(`/api/admin/news`, formData, config);
      if (res.data.status === true) {
        dispatch(newsCreated(res.data.response));
        dispatch(setAlert("News created successfully.", "success"));
        if (navigate) {
          navigate(`/admin/news`);
        }
      } else {
        const errors = res.data.errors;
        if (errors) {
          dispatch(newsError());
          dispatch(setAlert(res.data.message, "danger"));

          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") {
        return { status: false, cancelled: true };
      }
      if (err.response?.data && err.response.data.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        err.response &&
          dispatch(
            newsError({
              msg: err.response.statusText,
              status: err.response.status,
            })
          );

        dispatch(
          setAlert(
            err.response?.data?.message ||
              err.response?.message ||
              "Error creating news",
            "danger"
          )
        );
      }
      return { status: false };
    }
  };

export const updateNews =
  (formData, id, navigate, { onProgress, signal } = {}) =>
  async (dispatch) => {
    dispatch(removeErrors());
    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        allowDuplicates: true,
        signal,
        onUploadProgress: (event) => {
          if (!onProgress) {
            return;
          }
          if (event.total) {
            const percent = Math.min(
              100,
              Math.round((event.loaded * 100) / event.total)
            );
            onProgress(percent, event.loaded, event.total);
            return;
          }
          onProgress(null, event.loaded, event.total);
        },
      };
      const { txn_password, images, existingImages, ...newsData } = formData;
      const requestData = new FormData();

      Object.keys(newsData).forEach((key) => {
        if (newsData[key] !== null && newsData[key] !== undefined) {
          requestData.append(key, newsData[key]);
        }
      });

      if (existingImages) {
        requestData.append(
          "existingImages",
          typeof existingImages === "string"
            ? existingImages
            : JSON.stringify(existingImages)
        );
      }

      if (Array.isArray(images)) {
        images.forEach((file) => {
          if (file instanceof File) {
            requestData.append("images", file);
          }
        });
      }

      if (txn_password) {
        requestData.append("txn_password", txn_password);
      }

      const res = await api.put(`/api/admin/news/${id}`, requestData, config);
      if (res.data.status === true) {
        dispatch(newsUpdated(res.data.response));
        dispatch(setAlert("News updated successfully.", "success"));
        if (navigate) {
          navigate(`/admin/news`);
        }
      } else {
        const errors = res.data.errors;
        if (errors) {
          dispatch(newsError());
          dispatch(setAlert(res.data.message, "danger"));

          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") {
        return { status: false, cancelled: true };
      }
      if (err.response?.data && err.response.data.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        err.response &&
          dispatch(
            newsError({
              msg: err.response.statusText,
              status: err.response.status,
            })
          );

        dispatch(
          setAlert(
            err.response?.data?.message ||
              err.response?.message ||
              "Error updating news",
            "danger"
          )
        );
      }
      return { status: false };
    }
  };

export const deleteNews = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/news/${id}`, config);

    dispatch(newsDeleted(id));
    dispatch(setAlert("News deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        newsError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(
      setAlert(err.response?.message || "Error deleting news", "danger")
    );
  }
};

export const getNewsSettings = () => async (dispatch) => {
  try {
    dispatch(loadingNewsSettings());
    const res = await api.get("/api/admin/news/settings");

    if (res.data?.status && res.data.response) {
      dispatch(newsSettingsLoaded(res.data.response));
    } else {
      const errorMsg = res.data?.message || "Error fetching news settings";
      dispatch(newsError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const errorMsg =
        err.response?.data?.message || "Error fetching news settings";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const updateNewsSettings = (payload, onSuccess) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    dispatch(savingNewsSettings());
    const res = await api.put("/api/admin/news/settings", payload);

    if (res.data?.status) {
      dispatch(newsSettingsSaved(res.data.response));
      dispatch(setAlert("News settings updated successfully.", "success"));
      if (onSuccess) {
        onSuccess();
      }
    } else {
      const errors = res.data?.errors || [];
      dispatch(newsError());
      dispatch(
        setAlert(res.data?.message || "Error updating news settings", "danger")
      );
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        newsError({
          msg: err.response?.statusText,
          status: err.response?.status,
        })
      );
      dispatch(
        setAlert(
          err.response?.data?.message || "Error updating news settings",
          "danger"
        )
      );
    }
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetNews());
};

export const removeNewsErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};
