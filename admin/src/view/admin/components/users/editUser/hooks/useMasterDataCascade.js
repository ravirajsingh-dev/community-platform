import { useEffect, useCallback } from "react";

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

/**
 * Community → Vansh → Kul → Gotra (from Kul)
 *                        ↘ Khamp → Sub-Khamp
 */
export function useMasterDataCascade({
  community,
  vansh,
  kul,
  khamp,
  fetchVanshes,
  fetchKuls,
  fetchKhamps,
  fetchSubKhamps,
  fetchGotras,
  enabled = true,
}) {
  const communityId = community?.value;
  const vanshId = vansh?.value;
  const kulId = kul?.value;
  const khampId = khamp?.value;

  useEffect(() => {
    if (!enabled || !communityId) return;
    fetchVanshes(communityId);
  }, [communityId, enabled, fetchVanshes]);

  useEffect(() => {
    if (!enabled || !vanshId) return;
    fetchKuls(vanshId);
  }, [vanshId, enabled, fetchKuls]);

  useEffect(() => {
    if (!enabled || !kulId) return;
    fetchKhamps(kulId);
    fetchGotras(kulId);
  }, [kulId, enabled, fetchKhamps, fetchGotras]);

  useEffect(() => {
    if (!enabled || !khampId) return;
    fetchSubKhamps(khampId);
  }, [khampId, enabled, fetchSubKhamps]);

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

  return { applyMasterSelectChange, isMasterSelectField };
}
