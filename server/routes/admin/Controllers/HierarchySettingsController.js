const CommonSettings = require("../../../models/CommonSettings");
const response = require("../../../config/response");
const {
  ALL_HIERARCHY_CREATABLE_LEVELS,
  normalizeUserCreatableLevels,
  buildHierarchySettingsResponse,
} = require("../../../utils/hierarchyCreatableSettings");

const getHierarchySettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();

    return response.successResponse(
      res,
      buildHierarchySettingsResponse(settings),
      "Hierarchy settings retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching hierarchy settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch hierarchy settings",
      500,
    );
  }
};

const updateHierarchySettings = async (req, res) => {
  try {
    let { userCreatableLevels } = req.body;

    if (typeof userCreatableLevels === "string") {
      try {
        userCreatableLevels = JSON.parse(userCreatableLevels);
      } catch (parseError) {
        return response.errorResponse(
          res,
          [{ path: "userCreatableLevels", msg: "Invalid levels payload" }],
          "Validation Error",
          400,
        );
      }
    }

    if (!Array.isArray(userCreatableLevels)) {
      return response.errorResponse(
        res,
        [{ path: "userCreatableLevels", msg: "Levels must be an array" }],
        "Validation Error",
        400,
      );
    }

    const normalized = normalizeUserCreatableLevels(userCreatableLevels);

    if (normalized.length === 0) {
      return response.errorResponse(
        res,
        [
          {
            path: "userCreatableLevels",
            msg: "At least one hierarchy level must remain creatable",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const invalidLevels = userCreatableLevels.filter(
      (level) => !ALL_HIERARCHY_CREATABLE_LEVELS.includes(String(level).trim()),
    );
    if (invalidLevels.length > 0) {
      return response.errorResponse(
        res,
        [{ path: "userCreatableLevels", msg: "Invalid hierarchy level value" }],
        "Validation Error",
        400,
      );
    }

    const settings = await CommonSettings.getOrCreateSettings();
    settings.userCreatableLevels = normalized;
    await settings.save();

    return response.successResponse(
      res,
      buildHierarchySettingsResponse(settings),
      "Hierarchy settings updated successfully",
    );
  } catch (error) {
    console.error("Error updating hierarchy settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to update hierarchy settings",
      500,
    );
  }
};

module.exports = {
  getHierarchySettings,
  updateHierarchySettings,
};
