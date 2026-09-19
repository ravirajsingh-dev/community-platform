import { useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  fetchCommunities,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchSubKhamps,
  fetchGotras,
} from "@src/actions/masterDataActions";

const MASTER_SELECT_FIELDS = new Set([
  "community",
  "vansh",
  "kul",
  "khamp",
  "subKhamp",
  "gotra",
]);

/** Gotra depends on Kul; Khamp/Sub-Khamp do not reset Gotra. */
const CASCADE_RESETS = {
  community: ["vansh", "kul", "gotra", "khamp", "subKhamp"],
  vansh: ["kul", "gotra", "khamp", "subKhamp"],
  kul: ["gotra", "khamp", "subKhamp"],
  khamp: ["subKhamp"],
  subKhamp: [],
  gotra: [],
};

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value.value ?? null;
  return value;
};

/**
 * Community → Vansh → Kul → Gotra (from Kul)
 *                        ↘ Khamp → Sub-Khamp
 */
export function useMasterDataCascade({
  community = null,
  vansh = null,
  kul = null,
  khamp = null,
  enabled = true,
} = {}) {
  const dispatch = useDispatch();

  const communityId = toId(community);
  const vanshId = toId(vansh);
  const kulId = toId(kul);
  const khampId = toId(khamp);

  useEffect(() => {
    if (!enabled || !communityId) return;
    dispatch(fetchVanshes(communityId));
  }, [communityId, enabled, dispatch]);

  useEffect(() => {
    if (!enabled || !vanshId) return;
    dispatch(fetchKuls(vanshId));
  }, [vanshId, enabled, dispatch]);

  useEffect(() => {
    if (!enabled || !kulId) return;
    dispatch(fetchKhamps(kulId));
    dispatch(fetchGotras(kulId));
  }, [kulId, enabled, dispatch]);

  useEffect(() => {
    if (!enabled || !khampId) return;
    dispatch(fetchSubKhamps(khampId));
  }, [khampId, enabled, dispatch]);

  const loadCommunities = useCallback(
    () => dispatch(fetchCommunities()),
    [dispatch],
  );

  const loadVanshes = useCallback(() => {
    if (!communityId) return Promise.resolve({ data: [] });
    return dispatch(fetchVanshes(communityId));
  }, [dispatch, communityId]);

  const loadKuls = useCallback(() => {
    if (!vanshId) return Promise.resolve({ data: [] });
    return dispatch(fetchKuls(vanshId));
  }, [dispatch, vanshId]);

  const loadKhamps = useCallback(() => {
    if (!kulId) return Promise.resolve({ data: [] });
    return dispatch(fetchKhamps(kulId));
  }, [dispatch, kulId]);

  const loadSubKhamps = useCallback(() => {
    if (!khampId) return Promise.resolve({ data: [] });
    return dispatch(fetchSubKhamps(khampId));
  }, [dispatch, khampId]);

  const loadGotras = useCallback(() => {
    if (!kulId) return Promise.resolve({ data: [] });
    return dispatch(fetchGotras(kulId));
  }, [dispatch, kulId]);

  const applyMasterSelectChange = useCallback((field, selectedOption, prev) => {
    const next = { ...prev, [field]: selectedOption };
    const resetFields = CASCADE_RESETS[field];
    if (resetFields) {
      resetFields.forEach((key) => {
        next[key] = null;
      });
    }
    return next;
  }, []);

  const isMasterSelectField = useCallback(
    (field) => MASTER_SELECT_FIELDS.has(field),
    [],
  );

  return {
    loadCommunities,
    loadVanshes,
    loadKuls,
    loadKhamps,
    loadSubKhamps,
    loadGotras,
    applyMasterSelectChange,
    isMasterSelectField,
  };
}
