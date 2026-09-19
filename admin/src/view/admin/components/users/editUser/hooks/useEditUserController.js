import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

import { fetchStates } from "@actions/locationDropdownActions";
import { useLocationCascade } from "@src/hooks/useLocationCascade";
import { TAB_KEYS, TAB_LABELS } from "../editUserConstants";
import {
  buildSubmitDataForTab,
  hasAdditionalDetails,
  hasCommunityDetails,
  hasLocationDetails,
  isSectionEdited,
  validateTab,
} from "../editUserValidation";
import { buildFormDataFromUser } from "../editUserUtils";
import { useHydrateUserForm } from "./useHydrateUserForm";
import { useMasterDataCascade } from "./useMasterDataCascade";
import { useEditUserTabCallbacks } from "./useEditUserTabCallbacks";
import { useEditUserPage } from "./useEditUserPage";
import { useEditUserFormState } from "./useEditUserFormState";
import { useBrowserNavigationBlocker } from "./useBrowserNavigationBlocker";

export function useEditUserController() {
  const dispatch = useDispatch();
  const { user_id } = useParams();
  const [discardPrompt, setDiscardPrompt] = useState(null);
  const pendingNavigationRef = useRef(null);

  const page = useEditUserPage();
  const {
    errorList,
    loadingUserDetails,
    currentUser,
    masterDataDropdown,
    locationDropdown,
    editUser,
    setErrors,
    removeUserErrors,
    getUserById,
    resetComponentStore,
    fetchCommunities,
    fetchVanshes,
    fetchKuls,
    fetchKhamps,
    fetchSubKhamps,
    fetchGotras,
  } = page;

  const form = useEditUserFormState();
  const {
    formData,
    originalSnapshot,
    submitting,
    activeTab,
    editingTab,
    showPasswordField,
    showPasswordCopy,
    showConfirmModal,
    pendingSubmitData,
    pendingTabKey,
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
    setFormData,
  } = form;

  const isCommunityTabActive = activeTab === TAB_KEYS.community;
  const isLocationTabActive = activeTab === TAB_KEYS.location;

  const prefetchCommunity = useMemo(() => {
    const userDetails = currentUser?.userDetails;
    return (
      isCommunityTabActive ||
      Boolean(userDetails?.community) ||
      Boolean(currentUser?.community) ||
      Boolean(formData.community?.value)
    );
  }, [
    currentUser?.community,
    currentUser?.userDetails,
    formData.community?.value,
    isCommunityTabActive,
  ]);

  const prefetchLocation = useMemo(() => {
    const userDetails = currentUser?.userDetails;
    return (
      isLocationTabActive ||
      Boolean(
        userDetails?.stateCode || userDetails?.cityId || userDetails?.villageId,
      ) ||
      Boolean(formData.stateCode?.value || formData.cityId?.value)
    );
  }, [
    currentUser?.userDetails,
    formData.cityId?.value,
    formData.stateCode?.value,
    isLocationTabActive,
  ]);

  const masterCascadeEnabled = useMemo(
    () => isCommunityTabActive || editingTab === TAB_KEYS.community,
    [editingTab, isCommunityTabActive],
  );

  const { countryId, citiesKey, applyLocationSelectChange } =
    useLocationCascade({
      stateCode: formData.stateCode,
      cityId: formData.cityId,
      prefetchStates: isLocationTabActive,
      fetchVillagesEnabled: isLocationTabActive,
    });

  const { applyMasterSelectChange, isMasterSelectField } =
    useMasterDataCascade({
      community: formData.community,
      vansh: formData.vansh,
      kul: formData.kul,
      khamp: formData.khamp,
      fetchVanshes,
      fetchKuls,
      fetchKhamps,
      fetchSubKhamps,
      fetchGotras,
      enabled: masterCascadeEnabled,
    });

  const activeTabLabel = useMemo(
    () => TAB_LABELS[activeTab] || "Edit User",
    [activeTab],
  );

  const mappedCurrentUserFormData = useMemo(() => {
    if (!currentUser?._id) return null;
    return buildFormDataFromUser(currentUser, {
      masterDataDropdown,
      locationDropdown,
    });
  }, [currentUser, locationDropdown, masterDataDropdown]);

  const loadUserFormData = useCallback(
    (user, { force = false } = {}) => {
      if (!user) return;
      if (!force && editingTab) return;

      const data =
        user._id === currentUser?._id && mappedCurrentUserFormData
          ? mappedCurrentUserFormData
          : buildFormDataFromUser(user, {
              masterDataDropdown,
              locationDropdown,
            });

      hydrateForm(data);
    },
    [
      currentUser?._id,
      editingTab,
      hydrateForm,
      locationDropdown,
      mappedCurrentUserFormData,
      masterDataDropdown,
    ],
  );

  useHydrateUserForm({
    currentUser,
    editingTab,
    masterDataDropdown,
    locationDropdown,
    dispatch,
    hydrateForm: loadUserFormData,
    patchLocationLabels,
    prefetchCommunity,
    prefetchLocation,
  });

  const hasUnsavedEdits = useMemo(
    () =>
      Boolean(
        editingTab &&
          originalSnapshot &&
          isSectionEdited(editingTab, formData, originalSnapshot),
      ),
    [editingTab, formData, originalSnapshot],
  );

  useBrowserNavigationBlocker(hasUnsavedEdits, (proceed) => {
    pendingNavigationRef.current = proceed;
    setDiscardPrompt({ kind: "navigation" });
  });

  useEffect(() => {
    if (!hasUnsavedEdits) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedEdits]);

  useEffect(() => {
    if (isCommunityTabActive) {
      fetchCommunities();
    }
  }, [fetchCommunities, isCommunityTabActive]);

  useEffect(() => {
    if (!user_id) return;
    getUserById(user_id);
  }, [getUserById, user_id]);

  useEffect(() => {
    return () => {
      resetComponentStore();
    };
  }, [resetComponentStore]);

  const finishDiscard = useCallback(
    (onAfterDiscard) => {
      if (editingTab) {
        if (currentUser?._id) {
          loadUserFormData(currentUser, { force: true });
        } else if (originalSnapshot) {
          resetFromSnapshot();
        }
        clearEditingIfMatch(editingTab);
        removeUserErrors();
      }
      onAfterDiscard?.();
      setDiscardPrompt(null);
    },
    [
      clearEditingIfMatch,
      currentUser,
      editingTab,
      loadUserFormData,
      originalSnapshot,
      removeUserErrors,
      resetFromSnapshot,
    ],
  );

  const handleSelectChange = useCallback(
    (name, selectedOption) => {
      updateForm((prev) => {
        if (name === "stateCode" || name === "cityId") {
          return applyLocationSelectChange(name, selectedOption, prev);
        }
        if (isMasterSelectField(name)) {
          return applyMasterSelectChange(name, selectedOption, prev);
        }
        return { ...prev, [name]: selectedOption };
      });
    },
    [
      applyLocationSelectChange,
      applyMasterSelectChange,
      isMasterSelectField,
      updateForm,
    ],
  );

  const handleTabEdit = useCallback(
    async (tabKey) => {
      if (tabKey === TAB_KEYS.community) {
        fetchCommunities();
      }
      if (
        tabKey === TAB_KEYS.location &&
        originalSnapshot &&
        !hasLocationDetails(originalSnapshot)
      ) {
        await dispatch(fetchStates());
      }
      setEditingTab(tabKey);
    },
    [dispatch, fetchCommunities, originalSnapshot, setEditingTab],
  );

  const handleTabCancel = useCallback(
    (tabKey) => {
      if (currentUser?._id) {
        loadUserFormData(currentUser, { force: true });
      } else if (originalSnapshot) {
        resetFromSnapshot();
      }
      removeUserErrors();
      clearEditingIfMatch(tabKey);
    },
    [
      clearEditingIfMatch,
      currentUser,
      loadUserFormData,
      originalSnapshot,
      removeUserErrors,
      resetFromSnapshot,
    ],
  );

  const handleTabSave = useCallback(
    (tabKey) => {
      removeUserErrors();

      const result = validateTab(tabKey, {
        formData,
        originalSnapshot,
        showPasswordField,
      });

      if (result.noChanges) {
        return;
      }

      if (!result.valid) {
        setErrors(result.errors);
        return;
      }

      openConfirmModal(
        buildSubmitDataForTab(tabKey, formData, { showPasswordField }),
        tabKey,
      );
    },
    [
      formData,
      openConfirmModal,
      originalSnapshot,
      removeUserErrors,
      setErrors,
      showPasswordField,
    ],
  );

  const tabCallbacks = useEditUserTabCallbacks({
    onEdit: handleTabEdit,
    onCancel: handleTabCancel,
    onSave: handleTabSave,
  });

  const handleConfirmSave = useCallback(() => {
    if (!pendingSubmitData) return;

    startSubmit();
    editUser(pendingSubmitData, user_id).then((res) => {
      if (res && res.status === true) {
        submitSuccess();
      } else {
        submitDone();
      }
    });
  }, [
    editUser,
    pendingSubmitData,
    startSubmit,
    submitDone,
    submitSuccess,
    user_id,
  ]);

  const handleTabSelect = useCallback(
    (tabKey) => {
      const nextTab = tabKey || TAB_KEYS.core;
      if (nextTab === activeTab) return;

      if (hasUnsavedEdits) {
        setDiscardPrompt({ kind: "tab", nextTab });
        return;
      }

      if (editingTab) {
        handleTabCancel(editingTab);
      }
      setActiveTab(nextTab);
      removeUserErrors();
    },
    [
      activeTab,
      editingTab,
      handleTabCancel,
      hasUnsavedEdits,
      removeUserErrors,
      setActiveTab,
    ],
  );

  const handleConfirmDiscard = useCallback(() => {
    if (!discardPrompt) return;

    if (discardPrompt.kind === "tab") {
      finishDiscard(() => {
        setActiveTab(discardPrompt.nextTab);
      });
      return;
    }

    if (discardPrompt.kind === "navigation") {
      const proceed = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      finishDiscard(() => {
        proceed?.();
      });
    }
  }, [discardPrompt, finishDiscard, setActiveTab]);

  const handleCancelDiscard = useCallback(() => {
    pendingNavigationRef.current = null;
    setDiscardPrompt(null);
  }, []);

  const isTabDisabled = useCallback(
    (tabKey) => editingTab !== tabKey,
    [editingTab],
  );

  return {
    activeTab,
    activeTabLabel,
    additionalSectionComplete: hasAdditionalDetails(originalSnapshot),
    citiesKey,
    communitySectionComplete: hasCommunityDetails(originalSnapshot),
    countryId,
    currentUser,
    discardPrompt,
    errorList,
    formData,
    handleCancelDiscard,
    handleConfirmDiscard,
    handleConfirmSave,
    handleSelectChange,
    handleTabSelect,
    isTabDisabled,
    locationDropdown,
    locationSectionComplete: hasLocationDetails(originalSnapshot),
    masterDataDropdown,
    onFieldChange,
    pendingTabKey,
    setFormData,
    setShowPasswordCopy,
    setShowPasswordField,
    showConfirmModal,
    showPasswordCopy,
    showPasswordField,
    closeConfirmModal,
    submitting,
    tabCallbacks,
    userLoaded: !loadingUserDetails && Boolean(currentUser?._id),
    editingTab,
  };
}
