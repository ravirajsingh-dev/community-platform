/**
 * Build a CustomSelect option from profile / user community fields.
 * Uses the actual community name — never a generic "My Community" label.
 */
export function getCommunityOptionFromProfile(profile) {
  if (!profile) return null;

  const ud = profile.userDetails || {};
  const raw = ud.community ?? profile.community ?? null;

  if (!raw) return null;

  const value =
    typeof raw === "object"
      ? String(raw._id ?? raw.value ?? raw)
      : String(raw);

  if (!value || value === "undefined" || value === "null") return null;

  const fromObject =
    typeof raw === "object" && (raw.label || raw.name)
      ? String(raw.label || raw.name).trim()
      : "";

  const label =
    String(ud.communityLabel || "").trim() ||
    String(profile.communityLabel || "").trim() ||
    fromObject ||
    "";

  return {
    value,
    label,
    status: ud.communityStatus || profile.communityStatus || raw.status || "active",
  };
}

/**
 * Resolve community option with a real name from the communities dropdown list
 * when the profile only has an id (or a placeholder label).
 */
export async function resolveCommunityOption(profile, loadCommunities) {
  const base = getCommunityOptionFromProfile(profile);
  if (!base) return null;

  const needsName =
    !base.label || base.label === "My Community" || base.label === base.value;

  if (!needsName || typeof loadCommunities !== "function") {
    return base.label ? base : null;
  }

  try {
    const result = await loadCommunities();
    const options = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];
    const match = options.find(
      (item) => String(item.value) === String(base.value),
    );
    if (match?.label) {
      return {
        value: base.value,
        label: match.label,
        status: match.status || base.status,
      };
    }
  } catch (err) {
    console.error("Error resolving community name:", err);
  }

  return base.label ? base : null;
}
