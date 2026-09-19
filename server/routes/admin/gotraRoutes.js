const { createHierarchyAdminRoutes } = require("./hierarchyRoutesHelper");
const handlers = require("./Controllers/GotraController");
const { HIERARCHY_ENTITIES } = require("../../config/hierarchyEntityConfig");

module.exports = createHierarchyAdminRoutes({
  permissionModule: "gotra",
  handlers,
  handlerKeys: HIERARCHY_ENTITIES.gotra.exports,
});
