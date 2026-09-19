const express = require("express");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");

/**
 * Build Village-pattern admin routes for a hierarchy entity.
 * @param {object} options
 * @param {string} options.permissionModule - e.g. "communities", "vansh"
 * @param {Record<string, Function>} options.handlers - controller exports
 * @param {object} options.handlerKeys - map of route action to handler export name
 */
function createHierarchyAdminRoutes({
  permissionModule,
  handlers,
  handlerKeys,
}) {
  const router = express.Router();

  router.post(
    "/",
    [AdminAuth, checkPermission(permissionModule, "create")],
    handlers[handlerKeys.create],
  );

  router.get(
    "/",
    [AdminAuth, checkPermission(permissionModule, "list")],
    handlers[handlerKeys.list],
  );

  if (handlerKeys.bulkApprove && handlers[handlerKeys.bulkApprove]) {
    router.put(
      "/bulk-approve",
      [AdminAuth, checkPermission(permissionModule, "edit")],
      handlers[handlerKeys.bulkApprove],
    );
  }

  router.get(
    "/:id",
    [AdminAuth, checkPermission(permissionModule, "list")],
    handlers[handlerKeys.getById],
  );

  router.put(
    "/:id",
    [AdminAuth, checkPermission(permissionModule, "edit")],
    handlers[handlerKeys.update],
  );

  router.delete(
    "/:id/hard",
    [AdminAuth, checkPermission(permissionModule, "delete")],
    handlers[handlerKeys.hardDelete],
  );

  router.put(
    "/:id/approve",
    [AdminAuth, checkPermission(permissionModule, "edit")],
    handlers[handlerKeys.approve],
  );

  router.put(
    "/:id/reject",
    [AdminAuth, checkPermission(permissionModule, "edit")],
    handlers[handlerKeys.reject],
  );

  return router;
}

module.exports = { createHierarchyAdminRoutes };
