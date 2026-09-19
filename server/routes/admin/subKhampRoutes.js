const { createHierarchyAdminRoutes } = require("./hierarchyRoutesHelper");
const handlers = require("./Controllers/SubKhampController");
const { HIERARCHY_ENTITIES } = require("../../config/hierarchyEntityConfig");

module.exports = createHierarchyAdminRoutes({
  permissionModule: "subKhamp",
  handlers,
  handlerKeys: HIERARCHY_ENTITIES.subKhamp.exports,
});
