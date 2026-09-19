const { createHierarchyAdminRoutes } = require("./hierarchyRoutesHelper");
const handlers = require("./Controllers/CommunityController");
const { HIERARCHY_ENTITIES } = require("../../config/hierarchyEntityConfig");

module.exports = createHierarchyAdminRoutes({
  permissionModule: "communities",
  handlers,
  handlerKeys: HIERARCHY_ENTITIES.community.exports,
});
