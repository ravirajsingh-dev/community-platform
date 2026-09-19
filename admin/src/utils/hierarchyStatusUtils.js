export const HierarchyStatuses = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
  { label: "Rejected", value: "rejected" },
];

export const HierarchyLevelOptions = [
  { label: "Community", value: "community" },
  { label: "Vansh", value: "vansh" },
  { label: "Kul", value: "kul" },
  { label: "Khamp", value: "khamp" },
  { label: "Sub-Khamp", value: "subKhamp" },
  { label: "Gotra", value: "gotra" },
];

export function getHierarchyLevelOptionByValue(value) {
  if (!value) return null;
  return HierarchyLevelOptions.find((item) => item.value === value) || null;
}

export function getHierarchyStatusOptionByValue(value) {
  if (!value) return null;
  return HierarchyStatuses.find((item) => item.value === value) || null;
}

/**
 * Map hierarchy entity record to Village-style form status.
 */
export function entityToFormStatus(entity) {
  if (!entity) return "active";
  if (entity.status === "pending" || entity.status === "rejected") {
    return entity.status;
  }
  return entity.isActive === false ? "inactive" : "active";
}

export function getHierarchyStatusBadge(status) {
  switch (status) {
    case "active":
      return { bg: "success", label: "Active" };
    case "inactive":
      return { bg: "secondary", label: "Inactive" };
    case "pending":
      return { bg: "warning", label: "Pending" };
    case "rejected":
      return { bg: "danger", label: "Rejected" };
    default:
      return { bg: "secondary", label: status || "Unknown" };
  }
}
