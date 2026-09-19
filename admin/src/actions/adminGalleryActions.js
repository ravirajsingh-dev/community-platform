import api from "@src/utils/axiosSetup";
import { setAlert, removeAlert } from "./alert";
import { setErrorsList } from "./errors";
import { removeErrors } from "@src/reducers/errors";
import { adminLogout } from "./adminAuth";
import {
  galleryImageCreated,
  resetGallery,
  galleryListUpdated,
  galleryDeleted,
  galleryBulkDeleted,
  galleryError,
  gallerySearchParameterUpdate,
  loadingOnGallerySubmit,
  loadingGalleryList,
  gallerySettingsLoaded,
  loadingGallerySettings,
  savingGallerySettings,
  gallerySettingsSaved,
} from "@reducers/adminGalleryReducer";

const buildListConfig = (galleryParams) => {
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

  const query = galleryParams.query ? galleryParams.query : {};
  galleryParams.query = query;
  config.params = galleryParams;

  return config;
};

export const getGalleryImages = (galleryParams) => async (dispatch) => {
  try {
    dispatch(loadingGalleryList());

    const res = await api.get(`/api/admin/gallery`, buildListConfig(galleryParams));

    if (res.data && res.data.status && res.data.response && res.data.response[0]) {
      dispatch(gallerySearchParameterUpdate(galleryParams));
      dispatch(galleryListUpdated(res.data.response[0]));
    } else if (res.data && res.data.status === false) {
      const errorMsg = res.data.message || "Error fetching gallery";
      dispatch(galleryError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else if (err.response) {
      dispatch(
        galleryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
      const errorMsg =
        err.response?.data?.message || err.response?.message || "Error fetching gallery";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const getGallerySettings = () => async (dispatch) => {
  try {
    dispatch(loadingGallerySettings());
    const res = await api.get("/api/admin/gallery/settings");

    if (res.data?.status && res.data.response) {
      dispatch(gallerySettingsLoaded(res.data.response));
    } else {
      const errorMsg = res.data?.message || "Error fetching gallery settings";
      dispatch(galleryError({ msg: errorMsg, status: 400 }));
      dispatch(setAlert(errorMsg, "danger"));
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      const errorMsg =
        err.response?.data?.message || "Error fetching gallery settings";
      dispatch(setAlert(errorMsg, "danger"));
    }
  }
};

export const updateGallerySettings = (payload, onSuccess) => async (dispatch) => {
  dispatch(removeErrors());
  try {
    dispatch(savingGallerySettings());
    const res = await api.put("/api/admin/gallery/settings", payload);

    if (res.data?.status) {
      dispatch(gallerySettingsSaved(res.data.response));
      dispatch(setAlert("Gallery settings updated successfully.", "success"));
      if (onSuccess) {
        onSuccess();
      }
    } else {
      const errors = res.data?.errors || [];
      dispatch(galleryError());
      dispatch(setAlert(res.data?.message || "Error updating gallery settings", "danger"));
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
    }
  } catch (err) {
    if (err.response?.data && err.response.data.tokenStatus === 0) {
      dispatch(adminLogout());
    } else {
      dispatch(
        galleryError({
          msg: err.response?.statusText,
          status: err.response?.status,
        })
      );
      dispatch(
        setAlert(
          err.response?.data?.message || "Error updating gallery settings",
          "danger"
        )
      );
    }
  }
};

export const createGalleryImage =
  (formData, { onSuccess, onProgress, showAlert = true } = {}) =>
  async (dispatch) => {
    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        allowDuplicates: true,
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) {
            return;
          }
          const percent = Math.min(
            100,
            Math.round((event.loaded * 100) / event.total)
          );
          onProgress(percent);
        },
      };

      dispatch(loadingOnGallerySubmit());

      const res = await api.post(`/api/admin/gallery`, formData, config);
      if (res.data.status === true) {
        dispatch(galleryImageCreated(res.data.response));
        if (showAlert) {
          dispatch(setAlert("Gallery image uploaded successfully.", "success"));
        }
        if (onSuccess) {
          onSuccess(res.data.response);
        }
      } else {
        const errors = res.data.errors;
        if (errors) {
          dispatch(galleryError());
          if (showAlert) {
            dispatch(setAlert(res.data.message, "danger"));
          }

          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.response?.data && err.response.data.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        err.response &&
          dispatch(
            galleryError({
              msg: err.response.statusText,
              status: err.response.status,
            })
          );

        if (showAlert) {
          dispatch(
            setAlert(
              err.response?.data?.message ||
                err.response?.message ||
                "Error uploading image",
              "danger"
            )
          );
        }
      }
      return { status: false, message: err.response?.data?.message };
    }
  };

export const createGalleryImagesBulk =
  (formData, { onSuccess, onProgress, showAlert = true, signal } = {}) =>
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

      dispatch(loadingOnGallerySubmit());

      const res = await api.post(`/api/admin/gallery/bulk`, formData, config);
      if (res.data.status === true) {
        dispatch(galleryImageCreated(res.data.response));
        if (showAlert) {
          dispatch(
            setAlert(
              res.data.message || "Gallery images uploaded successfully.",
              "success"
            )
          );
        }
        if (onSuccess) {
          onSuccess(res.data.response);
        }
      } else {
        const errors = res.data.errors;
        if (errors) {
          dispatch(galleryError());
          if (showAlert) {
            dispatch(setAlert(res.data.message, "danger"));
          }

          errors.forEach((error) => {
            dispatch(setErrorsList(error.msg, error.path));
          });
        }
      }
      return res.data ? res.data : { status: false };
    } catch (err) {
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") {
        dispatch(galleryError());
        return { status: false, cancelled: true, message: "Upload cancelled" };
      }

      if (err.response?.data && err.response.data.tokenStatus === 0) {
        dispatch(adminLogout());
      } else {
        err.response &&
          dispatch(
            galleryError({
              msg: err.response.statusText,
              status: err.response.status,
            })
          );

        if (showAlert) {
          dispatch(
            setAlert(
              err.response?.data?.message || "Error uploading images",
              "danger"
            )
          );
        }
      }
      return {
        status: false,
        message: err.response?.data?.message,
        cancelled: err.response?.status === 499,
      };
    }
  };

export const deleteGalleryImage = (id, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        txn_password: txn_password,
      },
    };
    await api.delete(`/api/admin/gallery/${id}`, config);

    dispatch(galleryDeleted(id));
    dispatch(setAlert("Gallery image deleted successfully", "success"));
  } catch (err) {
    err.response &&
      dispatch(
        galleryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(setAlert(err.response?.message || "Error deleting image", "danger"));
  }
};

export const deleteGalleryImagesBulk = (ids, txn_password) => async (dispatch) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        ids,
        txn_password,
      },
    };

    const res = await api.delete(`/api/admin/gallery/bulk`, config);
    const failedIds = new Set(
      (res.data?.response?.failed || []).map((item) => String(item.id))
    );
    const deletedIds = ids.filter((id) => !failedIds.has(String(id)));

    dispatch(galleryBulkDeleted(deletedIds));
    dispatch(
      setAlert(
        res.data?.message || `${deletedIds.length} image(s) deleted successfully`,
        failedIds.size ? "warning" : "success"
      )
    );
  } catch (err) {
    err.response &&
      dispatch(
        galleryError({
          msg: err.response.statusText,
          status: err.response.status,
        })
      );
    dispatch(
      setAlert(err.response?.data?.message || "Error deleting images", "danger")
    );
  }
};

export const resetComponentStore = () => async (dispatch) => {
  await dispatch(resetGallery());
};

export const removeGalleryErrors = () => async (dispatch) => {
  dispatch(removeErrors());
};
