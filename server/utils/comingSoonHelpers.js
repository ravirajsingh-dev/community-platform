const slugifyComingSoonLabel = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const ensureUniqueSlug = (slug, usedSlugs) => {
  let base = slug || "feature";
  let candidate = base;
  let suffix = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`.slice(0, 60);
    suffix += 1;
  }
  usedSlugs.add(candidate);
  return candidate;
};

const makeComingSoonItemId = (index = 0) =>
  `cs_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Sanitize admin-submitted coming soon menu items.
 * @param {Array} items
 * @returns {Array}
 */
const sanitizeComingSoonMenuItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  const usedSlugs = new Set();
  const sanitized = [];

  items.forEach((item, index) => {
    if (!item || typeof item !== "object") return;

    const label = String(item.label || "").trim();
    if (!label) return;

    const rawSlug = String(item.slug || "").trim() || slugifyComingSoonLabel(label);
    const slug = ensureUniqueSlug(slugifyComingSoonLabel(rawSlug) || "feature", usedSlugs);
    const id =
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim()
        : makeComingSoonItemId(index);

    sanitized.push({
      id,
      label,
      slug,
      description: item.description ? String(item.description).trim() : "",
      enabled: item.enabled !== false && item.enabled !== "false",
      order: typeof item.order === "number" ? item.order : index,
    });
  });

  return sanitized.sort((a, b) => a.order - b.order);
};

/**
 * Public payload for client sidebar + coming soon page.
 * @param {Object} comingSoon
 * @returns {Object}
 */
const normalizePublicComingSoon = (comingSoon = {}) => {
  const raw = comingSoon?.toObject ? comingSoon.toObject() : comingSoon || {};
  const enabled = raw.enabled !== false;
  const title = raw.title || "Coming Soon";
  const description =
    raw.description ||
    "This feature is under development and will be available soon.";

  const menuItems = enabled
    ? sanitizeComingSoonMenuItems(raw.menuItems || [])
        .filter((item) => item.enabled)
        .map((item) => ({
          id: item.id,
          label: item.label,
          slug: item.slug,
          description: item.description,
          path: `/coming-soon/${item.slug}`,
          order: item.order,
        }))
    : [];

  return {
    enabled,
    title,
    description,
    menuItems,
  };
};

module.exports = {
  slugifyComingSoonLabel,
  sanitizeComingSoonMenuItems,
  normalizePublicComingSoon,
};
