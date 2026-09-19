const { createHierarchyAdminRoutes } = require("./hierarchyRoutesHelper");
const handlers = require("./Controllers/KhampController");
const { HIERARCHY_ENTITIES } = require("../../config/hierarchyEntityConfig");

module.exports = createHierarchyAdminRoutes({
  permissionModule: "khamp",
  handlers,
  handlerKeys: HIERARCHY_ENTITIES.khamp.exports,
});
