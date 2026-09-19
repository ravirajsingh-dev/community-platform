const response = require("../config/response");

const HIERARCHY_MODULES = [
  "communities",
  "vansh",
  "kul",
  "khamp",
  "subKhamp",
  "gotra",
];

function hasHierarchyModulePermission(permissions, module, action) {
  const modulePermission = permissions[module];

  if (modulePermission === true) return true;
  if (
    typeof modulePermission === "object" &&
    modulePermission !== null &&
    modulePermission[action] === true
  ) {
    return true;
  }
  return false;
}

/**
 * Allow access when sub-admin has the given action on any hierarchy module.
 */
const checkAnyHierarchyPermission = (action = "edit") => {
  return async (req, res, next) => {
    try {
      if (req.isAdmin) {
        return next();
      }

      if (req.isSubAdmin && req.userObj) {
        const permissions = req.userObj.permissions || {};
        const hasAny = HIERARCHY_MODULES.some((module) =>
          hasHierarchyModulePermission(permissions, module, action),
        );

        if (hasAny) {
          return next();
        }

        return response.errorResponse(
          res,
          {
            msg: "Access denied. You don't have permission to manage hierarchy approvals.",
          },
          "Insufficient Permissions",
          403,
        );
      }

      return response.errorResponse(
        res,
        { msg: "Access denied. Admin or sub-admin access required." },
        "Insufficient Permissions",
        403,
      );
    } catch (err) {
      console.error("Hierarchy permission check error:", err);
      return response.errorResponse(res, {}, "Server Error", 500);
    }
  };
};

module.exports = {
  checkAnyHierarchyPermission,
  HIERARCHY_MODULES,
  hasHierarchyModulePermission,
};
