/**
 * Frontend Permission Utilities
 * 
 * These utilities work with the dynamic permission system
 * and support ANY module/action without hardcoding
 */

/**
 * Check if user has permission for a module/action
 * @param {Object} user - User object from state (admin or sub-admin)
 * @param {String} module - Module name (e.g., 'users', 'dashboard', 'slider')
 * @param {String} action - Optional action name (e.g., 'list', 'create', 'edit', 'delete')
 * @returns {Boolean} - True if user has permission, false otherwise
 */
export const hasPermission = (user, module, action = null) => {
  // Admin (role 2) has full access
  if (user && (user.role === 2 || (typeof user.role === "number" && user.role === 2))) {
    return true;
  }

  // Sub-admin permission check
  if (!user || !user.permissions) {
    return false;
  }

  const permissions = user.permissions;

  // Check if module exists in permissions
  if (!permissions.hasOwnProperty(module)) {
    return false;
  }

  const modulePermission = permissions[module];

  // If module permission is boolean
  if (typeof modulePermission === "boolean") {
    return modulePermission === true;
  }

  // If module permission is an object (action-level permissions)
  if (typeof modulePermission === "object" && modulePermission !== null) {
    // If no specific action requested, check if module has any access
    if (!action) {
      // Check if any action is allowed
      return Object.values(modulePermission).some((val) => val === true);
    }

    // Check specific action
    if (!modulePermission.hasOwnProperty(action)) {
      return false;
    }

    return modulePermission[action] === true;
  }

  return false;
};

const HIERARCHY_EDIT_MODULES = [
  "communities",
  "vansh",
  "kul",
  "khamp",
  "subKhamp",
  "gotra",
];

/**
 * True when user can edit at least one hierarchy level (pending approvals access).
 */
export const hasAnyHierarchyEditPermission = (user) => {
  if (!user) return false;
  if (user.role === 2 || (typeof user.role === "number" && user.role === 2)) {
    return true;
  }
  return HIERARCHY_EDIT_MODULES.some((module) =>
    hasPermission(user, module, "edit"),
  );
};

/**
 * Check if user is admin
 */
const isAdmin = (user) => {
  return user && (user.role === 2 || (typeof user.role === "number" && user.role === 2));
};

/**
 * Check if user is sub-admin
 */
const isSubAdmin = (user) => {
  return user && (user.role === 3 || (typeof user.role === "number" && user.role === 3) || user.isSubAdmin);
};

/**
 * Check if user is admin or sub-admin
 * @param {Object} user - User object from state
 * @returns {Boolean}
 */
export const isAdminOrSubAdmin = (user) => {
  return isAdmin(user) || isSubAdmin(user);
};

const filterMenuChildren = (children, user) =>
  children.filter((child) => {
    if (child.children?.length) {
      const filteredNestedChildren = filterMenuChildren(child.children, user);
      if (filteredNestedChildren.length > 0) {
        child.children = filteredNestedChildren;
        return true;
      }
      return false;
    }

    if (child.key === "my-account") {
      return true;
    }
    if (child.key === "pending-approvals") {
      return hasAnyHierarchyEditPermission(user);
    }
    if (child.key === "hierarchy-settings") {
      return hasAnyHierarchyEditPermission(user);
    }
    const module = getModuleFromPath(child.path);
    return hasPermission(user, module);
  });

/**
 * Filter menu items based on permissions
 * @param {Array} menuItems - Array of menu items
 * @param {Object} user - User object from state
 * @returns {Array} - Filtered menu items
 */
export const filterMenuByPermissions = (menuItems, user) => {
  if (!user) return [];

  // Admin has access to everything
  if (isAdmin(user)) {
    return menuItems;
  }

  // Sub-admin: filter by permissions
  return menuItems.filter((item) => {
    // Sub-admins cannot manage other sub-admins - hide sub-admins menu
    if (item.key === "sub-admins") {
      return false;
    }

    // If item has children, check if any child has permission
    if (item.children && item.children.length > 0) {
      const filteredChildren = filterMenuChildren(item.children, user);

      // Only show parent if it has at least one accessible child
      if (filteredChildren.length > 0) {
        item.children = filteredChildren;
        return true;
      }
      return false;
    }

    // For items without children, check module permission
    const module = getModuleFromPath(item.path);
    return hasPermission(user, module);
  });
};

/**
 * Extract module name from route path
 * Maps frontend routes to permission module names
 * @param {String} path - Route path (e.g., '/admin/users-list', '/admin/slider')
 * @returns {String} - Module name (e.g., 'users', 'slider')
 */
export const getModuleFromPath = (path) => {
  if (!path) return "";

  // Remove /admin prefix if present
  const cleanPath = path.replace(/^\/admin\/?/, "");

  // Map common paths to module names
  const pathToModuleMap = {
    "dashboard": "dashboard",
    "application-settings": "application-settings",
    "legal-pages": "application-settings",
    "coming-soon": "application-settings",
    "my-account": "my-account",
    "change-password": "my-account",
    "users-list": "users",
    "users/add": "users",
    "users/edit": "users",
    "sub-admins": "sub-admins",
    "sub-admins/create": "sub-admins",
    "sub-admins/edit": "sub-admins",
    "slider": "slider",
    "gallery": "gallery",
    "donation/settings": "donation",
    "donation/buttons": "donation",
    "donation/requests": "donation",
    "membership/settings": "membership-plans",
    "membership-plans": "membership-plans",
    "payments": "payments",
    "wallets": "wallets",
    "wallets/admin-adjustments": "wallets",
    "villages": "villages",
    "villages/add": "villages",
    "villages/edit": "villages",
    "matrimonial/applications": "matrimonial",
    "family": "family",
    "communities": "communities",
    "vansh": "vansh",
    "kul": "kul",
    "khamp": "khamp",
    "subKhamp": "subKhamp",
    "gotra": "gotra",
    "community-management/community": "communities",
    "community-management/vansh": "vansh",
    "community-management/kul": "kul",
    "community-management/khamp": "khamp",
    "community-management/subKhamp": "subKhamp",
    "community-management/gotra": "gotra",
    "community-management/pending": "communities",
    "community-management/hierarchy-settings": "communities",
    "news": "news",
    "video": "video",
    "how-it-works": "how-it-works",
  };

  // Try exact match first
  if (pathToModuleMap[cleanPath]) {
    return pathToModuleMap[cleanPath];
  }

  // Try prefix match for nested routes
  for (const [key, module] of Object.entries(pathToModuleMap)) {
    if (cleanPath.startsWith(key)) {
      return module;
    }
  }

  // Default: use first segment of path as module name
  const segments = cleanPath.split("/");
  return segments[0] || "dashboard";
};

/**
 * Check if route should be accessible
 * @param {String} path - Route path
 * @param {Object} user - User object from state
 * @returns {Boolean}
 */
export const canAccessRoute = (path, user) => {
  if (!user) return false;

  // Admin has access to everything
  if (isAdmin(user)) {
    return true;
  }

  // Sub-admin: check permission
  const cleanPath = path.replace(/^\/admin\/?/, "");
  if (cleanPath === "my-account" || cleanPath.startsWith("my-account")) {
    return isAdminOrSubAdmin(user);
  }
  if (cleanPath === "change-password" || cleanPath.startsWith("change-password")) {
    return isAdminOrSubAdmin(user);
  }
  if (
    cleanPath === "community-management/pending" ||
    cleanPath.startsWith("community-management/pending")
  ) {
    return hasAnyHierarchyEditPermission(user);
  }
  if (
    cleanPath === "community-management/hierarchy-settings" ||
    cleanPath.startsWith("community-management/hierarchy-settings")
  ) {
    return hasAnyHierarchyEditPermission(user);
  }
  if (cleanPath.startsWith("community-management/")) {
    const segments = cleanPath.split("/");
    const entityKey = segments[1];
    const entityModuleMap = {
      community: "communities",
      vansh: "vansh",
      kul: "kul",
      khamp: "khamp",
      subKhamp: "subKhamp",
      gotra: "gotra",
    };
    const module = entityModuleMap[entityKey];
    if (module) {
      return hasPermission(user, module);
    }
  }

  const module = getModuleFromPath(path);
  return hasPermission(user, module);
};

/**
 * Get the first allowed route for a user
 * @param {Object} user - User object from state
 * @param {Array} routes - Optional array of route objects with path property
 * @returns {String|null} - First allowed route path or null if no access
 */
export const getFirstAllowedRoute = (user, routes = null) => {
  if (!user) return null;

  // Admin always gets dashboard
  if (isAdmin(user)) {
    return "/admin/dashboard";
  }

  // Sub-admin: find first route they have permission for
  if (!user.permissions || Object.keys(user.permissions).length === 0) {
    return null; // No permissions assigned
  }

  // If routes array provided, use it
  if (routes && Array.isArray(routes)) {
    for (const route of routes) {
      // Skip sub-admin management routes
      if (route.path.startsWith("sub-admins")) {
        continue;
      }

      // Check if user has permission for this route
      // Route paths are now relative, so construct full path for permission check
      const fullPath = `/admin/${route.path}`;
      if (canAccessRoute(fullPath, user)) {
        return `/admin/${route.path}`;
      }
    }
  }

  // Fallback: check common routes in priority order
  // Dashboard is optional - check it only if user has permission
  const commonRoutes = [
    "application-settings",
    "users-list",
    "slider",
    "gallery",
    "donation/settings",
    "donation/buttons",
    "donation/requests",
    "membership-plans",
    "dashboard", // Dashboard is last - optional feature
  ];

  for (const routePath of commonRoutes) {
    const fullPath = `/admin/${routePath}`;
    if (canAccessRoute(fullPath, user)) {
      return `/admin/${routePath}`;
    }
  }

  return null; // No accessible routes found
};
