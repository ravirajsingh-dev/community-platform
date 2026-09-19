const { createHierarchyAdminRoutes } = require("./hierarchyRoutesHelper");
const handlers = require("./Controllers/KulController");
const { HIERARCHY_ENTITIES } = require("../../config/hierarchyEntityConfig");

module.exports = createHierarchyAdminRoutes({
  permissionModule: "kul",
  handlers,
  handlerKeys: HIERARCHY_ENTITIES.kul.exports,
});
