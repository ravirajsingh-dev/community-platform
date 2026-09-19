const CommonSettings = require("../../../models/CommonSettings");
const response = require("../../../config/response");
const { buildHierarchySettingsResponse } = require("../../../utils/hierarchyCreatableSettings");

const getCreatableLevels = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();

    return response.successResponse(
      res,
      buildHierarchySettingsResponse(settings),
      "Creatable hierarchy levels fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching creatable hierarchy levels:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch creatable hierarchy levels",
      500,
    );
  }
};

module.exports = {
  getCreatableLevels,
};
