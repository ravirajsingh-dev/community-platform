const isActiveOnlyRequest = (reqQuery) =>
  reqQuery.activeOnly === "true" || reqQuery.activeOnly === true;

/**
 * Edit User dropdown requests pass activeOnly=true for a slim, active-only list.
 */
function applyHierarchyDropdownFilters(query, reqQuery) {
  const activeOnly = isActiveOnlyRequest(reqQuery);
  if (activeOnly) {
    query.isActive = true;
    query.isDeleted = false;
  }
  return activeOnly;
}

function applyVillageDropdownFilters(query, reqQuery) {
  const activeOnly = isActiveOnlyRequest(reqQuery);
  if (activeOnly) {
    query.status = "active";
  }
  return activeOnly;
}

function finalizeDropdownQuery(findQuery, activeOnly) {
  if (!activeOnly) return findQuery;
  return findQuery.select("_id name");
}

module.exports = {
  applyHierarchyDropdownFilters,
  applyVillageDropdownFilters,
  finalizeDropdownQuery,
};
