const {
  MASTER_DATA_ENTITIES,
} = require("../../../config/hierarchyEntityConfig");
const { createMasterDataHandlers } = require("../../../utils/masterDataHelper");

module.exports = createMasterDataHandlers(MASTER_DATA_ENTITIES);
