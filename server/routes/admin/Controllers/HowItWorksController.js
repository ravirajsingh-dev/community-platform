const response = require("../../../config/response");
const CommonSettings = require("../../../models/CommonSettings");
const {
  normalizeHowItWorksSettings,
  validateHowItWorksPayload,
} = require("../../../utils/howItWorksSettingsHelpers");

/**
 * @route GET /api/admin/how-it-works/settings
 * @desc Get How Our Platform Works section settings
 */
const getHowItWorksSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const howItWorks = normalizeHowItWorksSettings(settings.howItWorks);

    return response.successResponse(
      res,
      howItWorks,
      "How it works settings fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching how it works settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch how it works settings",
      500
    );
  }
};

/**
 * @route PUT /api/admin/how-it-works/settings
 * @desc Update How Our Platform Works section settings
 */
const updateHowItWorksSettings = async (req, res) => {
  try {
    let payload = req.body;

    if (typeof payload?.howItWorks === "string") {
      try {
        payload = JSON.parse(payload.howItWorks);
      } catch {
        payload = {};
      }
    } else if (payload?.howItWorks && typeof payload.howItWorks === "object") {
      payload = payload.howItWorks;
    }

    const validated = validateHowItWorksPayload(payload);
    const settings = await CommonSettings.getOrCreateSettings();

    settings.howItWorks = validated;
    settings.markModified("howItWorks");
    await settings.save();

    return response.successResponse(
      res,
      normalizeHowItWorksSettings(settings.howItWorks),
      "How it works settings updated successfully"
    );
  } catch (error) {
    console.error("Error updating how it works settings:", error);
    return response.errorResponse(
      res,
      [{ path: "howItWorks", msg: error.message }],
      error.message || "Failed to update how it works settings",
      400
    );
  }
};

/**
 * @route GET /api/common/how-it-works/settings
 * @desc Get public How Our Platform Works section settings
 */
const getPublicHowItWorksSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const howItWorks = normalizeHowItWorksSettings(settings.howItWorks);

    return response.successResponse(
      res,
      howItWorks,
      "How it works settings fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public how it works settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch how it works settings",
      500
    );
  }
};

module.exports = {
  getHowItWorksSettings,
  updateHowItWorksSettings,
  getPublicHowItWorksSettings,
};
