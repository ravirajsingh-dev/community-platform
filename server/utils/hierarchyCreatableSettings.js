const ALL_HIERARCHY_CREATABLE_LEVELS = [
  "community",
  "vansh",
  "kul",
  "khamp",
  "subKhamp",
  "gotra",
];

function normalizeUserCreatableLevels(levels) {
  if (!Array.isArray(levels) || levels.length === 0) {
    return [...ALL_HIERARCHY_CREATABLE_LEVELS];
  }

  const allowed = new Set(ALL_HIERARCHY_CREATABLE_LEVELS);
  const normalized = [];

  for (const level of levels) {
    const value = String(level).trim();
    if (allowed.has(value) && !normalized.includes(value)) {
      normalized.push(value);
    }
  }

  return normalized.length > 0
    ? normalized
    : [...ALL_HIERARCHY_CREATABLE_LEVELS];
}

function isUserCreatableLevel(level, levels) {
  return normalizeUserCreatableLevels(levels).includes(level);
}

function buildHierarchySettingsResponse(settings = {}) {
  return {
    userCreatableLevels: normalizeUserCreatableLevels(
      settings.userCreatableLevels,
    ),
  };
}

module.exports = {
  ALL_HIERARCHY_CREATABLE_LEVELS,
  normalizeUserCreatableLevels,
  isUserCreatableLevel,
  buildHierarchySettingsResponse,
};
