const { HIERARCHY_ENTITIES } = require("../../../config/hierarchyEntityConfig");
const { createHierarchyController } = require("../../../utils/hierarchyAdminHelper");

module.exports = createHierarchyController(HIERARCHY_ENTITIES.kul);
