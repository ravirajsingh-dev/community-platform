import { useEffect, useRef } from "react";
import {
  INDIA_COUNTRY_OPTION,
  INDIA_ISO2,
  INDIA_COUNTRY_ID,
  getLocationDropdownCacheKeys,
} from "@src/utils/locationData";
import { seedMasterDataFromUserDetails } from "@actions/masterDataDropdownActions";
import {
  fetchStates,
  fetchCities,
  seedVillageOption,
} from "@actions/locationDropdownActions";
import { toRefId } from "../editUserUtils";

export const hasDropdownDataForUser = (
  userDetails,
  masterDataDropdown,
  locationDropdown,
) => {
  const communityId = toRefId(userDetails.community);
  const stateCode = userDetails.stateCode || null;
  const cityId = userDetails.cityId ? String(userDetails.cityId) : null;
  const vanshId = toRefId(userDetails.vansh);
  const kulId = toRefId(userDetails.kul);
  const khampId = toRefId(userDetails.khamp);
  const subKhampId = toRefId(userDetails.subKhamp);
  const gotraId = toRefId(userDetails.gotra);
  const villageId = toRefId(userDetails.villageId);

  const statesCache = locationDropdown.states[INDIA_COUNTRY_ID] || [];
  const { citiesKey } = getLocationDropdownCacheKeys(
    INDIA_COUNTRY_OPTION,
    stateCode ? { value: stateCode } : null,
    statesCache,
  );

  return (
    (!communityId ||
      masterDataDropdown.communities.find((c) => c.value === communityId)) &&
    (!vanshId ||
      (communityId &&
        masterDataDropdown.vanshes[communityId]?.find(
          (v) => v.value === vanshId,
        ))) &&
    (!kulId ||
      (vanshId &&
        masterDataDropdown.kuls[vanshId]?.find((k) => k.value === kulId))) &&
    (!khampId ||
      (kulId &&
        masterDataDropdown.khamps[kulId]?.find((k) => k.value === khampId))) &&
    (!subKhampId ||
      (khampId &&
        masterDataDropdown.subKhamps[khampId]?.find(
          (s) => s.value === subKhampId,
        ))) &&
    (!gotraId ||
      (kulId &&
        masterDataDropdown.gotras[kulId]?.find(
          (g) => g.value === gotraId,
        ))) &&
    (!stateCode || statesCache.find((s) => s.value === stateCode)) &&
    (!cityId ||
      (citiesKey &&
        locationDropdown.cities[citiesKey]?.find((d) => d.value === cityId))) &&
    (!villageId ||
      (cityId &&
        locationDropdown.villages[cityId]?.find((v) => v.value === villageId)))
  );
};

/**
 * Fetches missing dropdown caches, hydrates the form when data is ready,
 * and patches state/city labels as options load — without wiping active edits.
 */
export function useHydrateUserForm({
  currentUser,
  editingTab,
  masterDataDropdown,
  locationDropdown,
  dispatch,
  hydrateForm,
  patchLocationLabels,
  prefetchCommunity = false,
  prefetchLocation = false,
}) {
  const prefetchedRef = useRef({
    userId: null,
    community: false,
    location: false,
  });
  const hydratedUserIdRef = useRef(null);

  useEffect(() => {
    if (!currentUser?._id) return;

    if (prefetchedRef.current.userId !== currentUser._id) {
      prefetchedRef.current = {
        userId: currentUser._id,
        community: false,
        location: false,
      };
      hydratedUserIdRef.current = null;
    }

    const shouldFetchCommunity =
      prefetchCommunity && !prefetchedRef.current.community;
    const shouldFetchLocation =
      prefetchLocation && !prefetchedRef.current.location;
    if (!shouldFetchCommunity && !shouldFetchLocation) return;

    const ensureDropdowns = async () => {
      const userDetails = {
        ...(currentUser.userDetails || {}),
        community:
          currentUser.userDetails?.community || currentUser.community || null,
        communityLabel:
          currentUser.userDetails?.communityLabel ||
          currentUser.communityLabel ||
          "",
      };

      if (shouldFetchCommunity) {
        dispatch(seedMasterDataFromUserDetails(userDetails));
        prefetchedRef.current.community = true;
      }

      if (shouldFetchLocation) {
        if (userDetails.stateCode) {
          await dispatch(fetchStates());
        }

        if (userDetails.cityId && userDetails.stateCode) {
          await dispatch(fetchCities({ value: userDetails.stateCode }));
        }

        if (userDetails.villageId && userDetails.cityId) {
          const cityIdStr = String(userDetails.cityId);
          dispatch(
            seedVillageOption(
              cityIdStr,
              userDetails.villageId,
              userDetails.villageLabel,
            ),
          );
        }

        prefetchedRef.current.location = true;
      }
    };

    ensureDropdowns();
  }, [
    currentUser,
    dispatch,
    locationDropdown.villages,
    masterDataDropdown.communities,
    masterDataDropdown.gotras,
    masterDataDropdown.subKhamps,
    masterDataDropdown.khamps,
    masterDataDropdown.kuls,
    masterDataDropdown.vanshes,
    prefetchCommunity,
    prefetchLocation,
  ]);

  useEffect(() => {
    // Core fields (name/phone/email/status) live on User — hydrate even when
    // userDetails is null (admin-created users, incomplete profiles).
    if (!currentUser?._id || editingTab) return;

    const userDetails = currentUser.userDetails || {};
    const allDataReady = hasDropdownDataForUser(
      userDetails,
      masterDataDropdown,
      locationDropdown,
    );

    if (allDataReady) {
      hydrateForm(currentUser);
      hydratedUserIdRef.current = currentUser._id;
      return;
    }

    if (hydratedUserIdRef.current !== currentUser._id) {
      hydrateForm(currentUser);
      hydratedUserIdRef.current = currentUser._id;
      return;
    }

    patchLocationLabels(currentUser, locationDropdown);
  }, [
    currentUser,
    editingTab,
    hydrateForm,
    locationDropdown,
    masterDataDropdown,
    patchLocationLabels,
  ]);
}
