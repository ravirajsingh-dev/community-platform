import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import { getUserProfile, updateUserProfile } from "@src/actions/profileActions";
import { setErrorsList } from "@src/actions/errors";
import { removeErrors } from "@src/reducers/errors";
import { setAlert } from "@src/actions/alert";
import { useLocationCascade } from "@src/hooks/useLocationCascade";
import { useMasterDataCascade } from "@src/hooks/useMasterDataCascade";
import { TAB_KEYS, TAB_LABELS } from "../myAccountConstants";
import {
  buildFormDataFromProfile,
  buildSubmitDataForTab,
  getLockFlagsFromProfile,
  isSectionEdited,
  patchLocationFields,
  stripEmptyValues,
} from "../myAccountUtils";
import {
  getMissingGeneralProfileFields,
  getMissingCountByTab,
} from "@src/utils/profileCompletion";
import {
  hasAdditionalDetails,
  hasCommunityDetails,
  hasLocationDetails,
  validateTab,
} from "../myAccountValidation";
import {
  isMembershipActive,
  needsPayment,
  needsRenewal,
} from "@src/utils/membershipUtils";

export function useMyAccountController({ getUserProfile, updateUserProfile }) {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationDropdown = useSelector((state) => state.locationDropdown);
  const errorList = useSelector((state) => state.errors);
  const profile = useSelector((state) => state.profile);
  const user = useSelector((state) => state.auth.user);

  const initialTabParam = searchParams.get("tab");
  const defaultTab =
    !initialTabParam &&
    user &&
    (needsPayment(user) || needsRenewal(user) || !isMembershipActive(user))
      ? TAB_KEYS.membership
      : TAB_KEYS.core;
  const [activeTab, setActiveTab] = useState(
    initialTabParam && Object.values(TAB_KEYS).includes(initialTabParam)
      ? initialTabParam
      : defaultTab,
  );
  const [formData, setFormData] = useState(null);
  const [originalSnapshot, setOriginalSnapshot] = useState(null);
  const [editingTab, setEditingTab] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [pendingTabKey, setPendingTabKey] = useState(null);
  const [discardPrompt, setDiscardPrompt] = useState(null);
  const [communityDetailsLocked, setCommunityDetailsLocked] = useState(false);
  const [locationDetailsLocked, setLocationDetailsLocked] = useState(false);

  const populatedProfileIdRef = useRef(null);

  const isCommunityTabActive = activeTab === TAB_KEYS.community;
  const isLocationTabActive = activeTab === TAB_KEYS.location;
  const hasLocationOnProfile = Boolean(
    profile.profile?.userDetails?.stateCode ||
      profile.profile?.userDetails?.cityId,
  );

  const { loadStates, loadCities, loadVillages, applyLocationSelectChange } =
    useLocationCascade({
      stateCode: formData?.stateCode,
      cityId: formData?.cityId,
      prefetchStates: isLocationTabActive || hasLocationOnProfile,
      fetchVillagesEnabled: isLocationTabActive,
    });

  const { applyMasterSelectChange, isMasterSelectField } =
    useMasterDataCascade({
      enabled: isCommunityTabActive || editingTab === TAB_KEYS.community,
    });

  const hydrateFromProfile = useCallback(
    (data, { force = false } = {}) => {
      if (!data) return;
      if (!force && editingTab) return;

      const nextFormData = buildFormDataFromProfile(data, locationDropdown);
      const locks = getLockFlagsFromProfile(data);
      setFormData(nextFormData);
      setOriginalSnapshot(nextFormData);
      setCommunityDetailsLocked(locks.communityDetailsLocked);
      setLocationDetailsLocked(locks.locationDetailsLocked);
      populatedProfileIdRef.current = data._id?.toString();
    },
    [editingTab, locationDropdown],
  );

  useEffect(() => {
    const skipProfileFetch =
      activeTab === TAB_KEYS.membership ||
      activeTab === TAB_KEYS.wallet ||
      activeTab === TAB_KEYS.password;

    if (skipProfileFetch) {
      return;
    }

    if (profile.profile && !formData) {
      hydrateFromProfile(profile.profile);
      return;
    }

    if (!profile.profile && !profile.loading && !profile.error) {
      getUserProfile();
    }
  }, [
    activeTab,
    formData,
    getUserProfile,
    hydrateFromProfile,
    profile.error,
    profile.loading,
    profile.profile,
  ]);

  useEffect(() => {
    if (profile.profile && profile.success && !profile.loading) {
      const newProfileId = profile.profile._id?.toString();
      if (
        newProfileId &&
        newProfileId !== populatedProfileIdRef.current &&
        !editingTab
      ) {
        hydrateFromProfile(profile.profile, { force: true });
        setEditingTab(null);
      }
    }
  }, [
    editingTab,
    hydrateFromProfile,
    profile.loading,
    profile.profile,
    profile.success,
  ]);

  useEffect(() => {
    if (!profile.profile?.userDetails || editingTab) return;

    const applyPatch = (prev) => {
      if (!prev) return prev;
      return patchLocationFields(prev, profile.profile, locationDropdown);
    };

    setFormData((prev) => applyPatch(prev));
    setOriginalSnapshot((prev) => applyPatch(prev));
  }, [editingTab, locationDropdown, profile.profile]);

  const activeTabLabel = useMemo(
    () => TAB_LABELS[activeTab] || "My Account",
    [activeTab],
  );

  const missingTabCounts = useMemo(() => {
    if (!profile.profile) return {};
    const missing = getMissingGeneralProfileFields(
      profile.profile,
      profile.profile.userDetails,
      profile.requirements,
    );
    return getMissingCountByTab(missing);
  }, [profile.profile, profile.requirements]);

  const hasUnsavedEdits = useMemo(
    () =>
      Boolean(
        editingTab &&
          originalSnapshot &&
          isSectionEdited(editingTab, formData, originalSnapshot),
      ),
    [editingTab, formData, originalSnapshot],
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const membershipDefaultTab =
      user &&
      (needsPayment(user) || needsRenewal(user) || !isMembershipActive(user))
        ? TAB_KEYS.membership
        : TAB_KEYS.core;
    const nextTab =
      tabParam && Object.values(TAB_KEYS).includes(tabParam)
        ? tabParam
        : membershipDefaultTab;
    if (nextTab !== activeTab && !hasUnsavedEdits && !editingTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, editingTab, hasUnsavedEdits, searchParams, user]);

  const clearErrors = useCallback(() => {
    dispatch(removeErrors());
  }, [dispatch]);

  const setErrors = useCallback(
    (errors) => {
      clearErrors();
      errors.forEach((error) => {
        dispatch(setErrorsList(error.msg, error.path));
      });
      dispatch(setAlert("Please correct the errors below", "danger"));
    },
    [clearErrors, dispatch],
  );

  const onFieldChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === "dob") {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setFullYear(today.getFullYear() - 3);
      if (selectedDate > today || selectedDate > minDate) return;
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "occupation") {
        next.occupationDepartment = "";
        next.occupationPosition = "";
        next.occupationLocation = "";
        next.occupationBusinessName = "";
        next.occupationBusinessType = "";
      }
      return next;
    });
  }, []);

  const handleSelectChange = useCallback(
    (name, selectedOption) => {
      setFormData((prev) => {
        if (name === "stateCode" || name === "cityId") {
          return applyLocationSelectChange(name, selectedOption, prev);
        }
        if (isMasterSelectField(name)) {
          return applyMasterSelectChange(name, selectedOption, prev);
        }
        return { ...prev, [name]: selectedOption };
      });
    },
    [applyLocationSelectChange, applyMasterSelectChange, isMasterSelectField],
  );

  const resetCurrentTab = useCallback(
    (tabKey) => {
      if (originalSnapshot) {
        setFormData(originalSnapshot);
      } else if (profile.profile) {
        hydrateFromProfile(profile.profile, { force: true });
      }
      clearErrors();
      if (editingTab === tabKey) {
        setEditingTab(null);
      }
    },
    [clearErrors, editingTab, hydrateFromProfile, originalSnapshot, profile.profile],
  );

  const handleTabEdit = useCallback(
    async (tabKey) => {
      if (tabKey === TAB_KEYS.location && !locationDetailsLocked) {
        await loadStates();
      }
      setEditingTab(tabKey);
      clearErrors();
    },
    [clearErrors, loadStates, locationDetailsLocked],
  );

  const handleTabCancel = useCallback(
    (tabKey) => {
      resetCurrentTab(tabKey);
    },
    [resetCurrentTab],
  );

  const handleTabSave = useCallback(
    (tabKey) => {
      clearErrors();

      const result = validateTab(tabKey, {
        formData,
        originalSnapshot,
        communityDetailsLocked,
        locationDetailsLocked,
      });

      if (result.noChanges) return;

      if (!result.valid) {
        setErrors(result.errors);
        return;
      }

      const submitData = stripEmptyValues(
        buildSubmitDataForTab(tabKey, formData, {
          communityDetailsLocked,
          locationDetailsLocked,
        }),
      );

      setPendingSubmitData(submitData);
      setPendingTabKey(tabKey);
      setShowConfirmModal(true);
    },
    [
      clearErrors,
      communityDetailsLocked,
      formData,
      locationDetailsLocked,
      originalSnapshot,
      setErrors,
    ],
  );

  const handleConfirmSave = useCallback(async () => {
    if (!pendingSubmitData) return;

    setShowConfirmModal(false);
    setSubmitting(true);

    const result = await updateUserProfile(pendingSubmitData);
    setSubmitting(false);
    setPendingSubmitData(null);

    if (result) {
      setEditingTab(null);
      setPendingTabKey(null);
    }
  }, [pendingSubmitData, updateUserProfile]);

  const closeConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
    setPendingSubmitData(null);
    setPendingTabKey(null);
  }, []);

  const finishDiscard = useCallback(
    (onAfterDiscard) => {
      if (editingTab) {
        resetCurrentTab(editingTab);
      }
      onAfterDiscard?.();
      setDiscardPrompt(null);
    },
    [editingTab, resetCurrentTab],
  );

  const handleTabSelect = useCallback(
    (tabKey) => {
      const nextTab = tabKey || TAB_KEYS.core;
      if (nextTab === activeTab) return;

      if (hasUnsavedEdits) {
        setDiscardPrompt({ kind: "tab", nextTab });
        return;
      }

      if (editingTab) {
        resetCurrentTab(editingTab);
      }

      setActiveTab(nextTab);
      setSearchParams(nextTab === TAB_KEYS.core ? {} : { tab: nextTab }, {
        replace: true,
      });
      clearErrors();
    },
    [
      activeTab,
      clearErrors,
      editingTab,
      hasUnsavedEdits,
      resetCurrentTab,
      setSearchParams,
    ],
  );

  const handleConfirmDiscard = useCallback(() => {
    if (!discardPrompt) return;

    if (discardPrompt.kind === "tab") {
      finishDiscard(() => {
        setActiveTab(discardPrompt.nextTab);
        setSearchParams(
          discardPrompt.nextTab === TAB_KEYS.core
            ? {}
            : { tab: discardPrompt.nextTab },
          { replace: true },
        );
      });
    }
  }, [discardPrompt, finishDiscard, setSearchParams]);

  const handleCancelDiscard = useCallback(() => {
    setDiscardPrompt(null);
  }, []);

  const isTabDisabled = useCallback(
    (tabKey) => editingTab !== tabKey,
    [editingTab],
  );

  const tabCallbacks = useMemo(
    () => ({
      [TAB_KEYS.core]: {
        onEdit: () => handleTabEdit(TAB_KEYS.core),
        onCancel: () => handleTabCancel(TAB_KEYS.core),
        onSave: () => handleTabSave(TAB_KEYS.core),
      },
      [TAB_KEYS.additional]: {
        onEdit: () => handleTabEdit(TAB_KEYS.additional),
        onCancel: () => handleTabCancel(TAB_KEYS.additional),
        onSave: () => handleTabSave(TAB_KEYS.additional),
      },
      [TAB_KEYS.community]: {
        onEdit: () => handleTabEdit(TAB_KEYS.community),
        onCancel: () => handleTabCancel(TAB_KEYS.community),
        onSave: () => handleTabSave(TAB_KEYS.community),
      },
      [TAB_KEYS.location]: {
        onEdit: () => handleTabEdit(TAB_KEYS.location),
        onCancel: () => handleTabCancel(TAB_KEYS.location),
        onSave: () => handleTabSave(TAB_KEYS.location),
      },
    }),
    [handleTabCancel, handleTabEdit, handleTabSave],
  );

  return {
    activeTab,
    activeTabLabel,
    additionalSectionComplete: hasAdditionalDetails(originalSnapshot),
    communityDetailsLocked,
    communitySectionComplete: hasCommunityDetails(originalSnapshot),
    discardPrompt,
    editingTab,
    errorList,
    formData,
    handleCancelDiscard,
    handleConfirmDiscard,
    handleConfirmSave,
    handleSelectChange,
    handleTabSelect,
    isTabDisabled,
    loadCities,
    loadStates,
    loadVillages,
    locationDetailsLocked,
    locationSectionComplete: hasLocationDetails(originalSnapshot),
    missingTabCounts,
    onFieldChange,
    pendingTabKey,
    profile,
    setFormData,
    showConfirmModal,
    closeConfirmModal,
    submitting,
    tabCallbacks,
    userLoaded:
      activeTab === TAB_KEYS.membership ||
      activeTab === TAB_KEYS.wallet ||
      activeTab === TAB_KEYS.password ||
      (!profile.loading && (Boolean(formData) || Boolean(profile.error))),
  };
}
