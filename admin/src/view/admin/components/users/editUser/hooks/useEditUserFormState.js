import { useReducer, useCallback } from "react";
import { TAB_KEYS, OCCUPATION_DETAIL_KEYS } from "../editUserConstants";
import { INITIAL_FORM_DATA, patchLocationFields } from "../editUserUtils";

const initialFormState = {
  formData: INITIAL_FORM_DATA,
  originalSnapshot: null,
  submitting: false,
  activeTab: TAB_KEYS.core,
  editingTab: null,
  showPasswordField: false,
  showPasswordCopy: false,
  showConfirmModal: false,
  pendingSubmitData: null,
  pendingTabKey: null,
};

const editUserFormReducer = (state, action) => {
  switch (action.type) {
    case "HYDRATE_FORM":
      return {
        ...state,
        formData: action.payload,
        originalSnapshot: action.payload,
        editingTab: null,
        showPasswordField: false,
      };
    case "UPDATE_FORM":
      return {
        ...state,
        formData:
          typeof action.payload === "function"
            ? action.payload(state.formData)
            : action.payload,
      };
    case "PATCH_LOCATION_LABELS":
      return {
        ...state,
        formData: patchLocationFields(
          state.formData,
          action.user,
          action.dropdown,
        ),
      };
    case "FIELD_CHANGE": {
      const next = { ...state.formData, [action.name]: action.value };
      if (action.name === "occupation") {
        OCCUPATION_DETAIL_KEYS.forEach((field) => {
          next[field] = "";
        });
      }
      return { ...state, formData: next };
    }
    case "RESET_FROM_SNAPSHOT":
      if (!state.originalSnapshot) return state;
      return {
        ...state,
        formData: { ...state.originalSnapshot, password: "" },
        editingTab: null,
        showPasswordField: false,
      };
    case "SET_EDITING_TAB":
      return { ...state, editingTab: action.payload };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_SHOW_PASSWORD_FIELD":
      return { ...state, showPasswordField: action.payload };
    case "SET_SHOW_PASSWORD_COPY":
      return { ...state, showPasswordCopy: action.payload };
    case "OPEN_CONFIRM_MODAL":
      return {
        ...state,
        pendingSubmitData: action.submitData,
        pendingTabKey: action.tabKey,
        showConfirmModal: true,
      };
    case "CLOSE_CONFIRM_MODAL":
      return {
        ...state,
        showConfirmModal: false,
        pendingSubmitData: null,
        pendingTabKey: null,
      };
    case "START_SUBMIT":
      return { ...state, submitting: true, showConfirmModal: false };
    case "SUBMIT_SUCCESS": {
      const snapshot = { ...state.formData, password: "" };
      return {
        ...state,
        submitting: false,
        editingTab: null,
        showPasswordField: false,
        formData: snapshot,
        originalSnapshot: snapshot,
        pendingSubmitData: null,
        pendingTabKey: null,
      };
    }
    case "SUBMIT_DONE":
      return {
        ...state,
        submitting: false,
        pendingSubmitData: null,
        pendingTabKey: null,
      };
    case "CLEAR_EDITING_IF_MATCH":
      return state.editingTab === action.tabKey
        ? { ...state, editingTab: null }
        : state;
    default:
      return state;
  }
};

export function useEditUserFormState() {
  const [state, dispatch] = useReducer(editUserFormReducer, initialFormState);

  const hydrateForm = useCallback((data) => {
    dispatch({ type: "HYDRATE_FORM", payload: data });
  }, []);

  const updateForm = useCallback((updater) => {
    dispatch({ type: "UPDATE_FORM", payload: updater });
  }, []);

  const patchLocationLabels = useCallback((user, dropdown) => {
    dispatch({ type: "PATCH_LOCATION_LABELS", user, dropdown });
  }, []);

  const onFieldChange = useCallback((e) => {
    if (!e.target) return;
    const { name, value, type, checked } = e.target;
    dispatch({
      type: "FIELD_CHANGE",
      name,
      value: type === "checkbox" ? checked : value,
    });
  }, []);

  const resetFromSnapshot = useCallback(() => {
    dispatch({ type: "RESET_FROM_SNAPSHOT" });
  }, []);

  const setEditingTab = useCallback((tabKey) => {
    dispatch({ type: "SET_EDITING_TAB", payload: tabKey });
  }, []);

  const setActiveTab = useCallback((tabKey) => {
    dispatch({ type: "SET_ACTIVE_TAB", payload: tabKey });
  }, []);

  const setShowPasswordField = useCallback((value) => {
    dispatch({ type: "SET_SHOW_PASSWORD_FIELD", payload: value });
  }, []);

  const setShowPasswordCopy = useCallback((value) => {
    dispatch({ type: "SET_SHOW_PASSWORD_COPY", payload: value });
  }, []);

  const openConfirmModal = useCallback((submitData, tabKey) => {
    dispatch({ type: "OPEN_CONFIRM_MODAL", submitData, tabKey });
  }, []);

  const closeConfirmModal = useCallback(() => {
    dispatch({ type: "CLOSE_CONFIRM_MODAL" });
  }, []);

  const startSubmit = useCallback(() => {
    dispatch({ type: "START_SUBMIT" });
  }, []);

  const submitSuccess = useCallback(() => {
    dispatch({ type: "SUBMIT_SUCCESS" });
  }, []);

  const submitDone = useCallback(() => {
    dispatch({ type: "SUBMIT_DONE" });
  }, []);

  const clearEditingIfMatch = useCallback((tabKey) => {
    dispatch({ type: "CLEAR_EDITING_IF_MATCH", tabKey });
  }, []);

  return {
    ...state,
    hydrateForm,
    updateForm,
    patchLocationLabels,
    onFieldChange,
    resetFromSnapshot,
    setEditingTab,
    setActiveTab,
    setShowPasswordField,
    setShowPasswordCopy,
    openConfirmModal,
    closeConfirmModal,
    startSubmit,
    submitSuccess,
    submitDone,
    clearEditingIfMatch,
    setFormData: updateForm,
  };
}
