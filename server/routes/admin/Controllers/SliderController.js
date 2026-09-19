const response = require("../../../config/response");
const SliderBanner = require("../../../models/SliderBanner");
const CommonSettings = require("../../../models/CommonSettings");
const { uploadToR2, deleteFromR2 } = require("../../../helpers/r2Helper");
const { normalizeHeroSettings } = require("../../../utils/heroSettingsHelpers");

const getNextOrder = async () => {
  const maxBanner = await SliderBanner.findOne()
    .sort({ order: -1 })
    .select("order")
    .lean();
  return (maxBanner?.order ?? 0) + 1;
};

const shiftOrdersForInsert = async (targetOrder, excludeId = null) => {
  const filter = { order: { $gte: targetOrder } };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  await SliderBanner.updateMany(filter, { $inc: { order: 1 } });
};

const applyOrderChange = async (bannerId, oldOrder, newOrder) => {
  if (oldOrder === newOrder) {
    return;
  }

  if (newOrder < oldOrder) {
    await SliderBanner.updateMany(
      { _id: { $ne: bannerId }, order: { $gte: newOrder, $lt: oldOrder } },
      { $inc: { order: 1 } },
    );
  } else {
    await SliderBanner.updateMany(
      { _id: { $ne: bannerId }, order: { $gt: oldOrder, $lte: newOrder } },
      { $inc: { order: -1 } },
    );
  }
};

const shiftOrdersAfterDelete = async (deletedOrder) => {
  await SliderBanner.updateMany(
    { order: { $gt: deletedOrder } },
    { $inc: { order: -1 } },
  );
};

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined) {
    return defaultValue;
  }
  return value === "true" || value === true;
};

/**
 * @route POST /api/admin/slider
 * @desc Create a new slider banner
 */
const createSliderBanner = async (req, res) => {
  let uploadedKey = null;

  try {
    const { title, order, isActive } = req.body;

    if (!req.file) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image is required" }],
        "Image is required",
        400,
      );
    }

    const uploadResult = await uploadToR2(req.file, "slider");
    uploadedKey = uploadResult.key;

    let targetOrder;
    if (order !== undefined && order !== "" && order !== null) {
      targetOrder = Math.max(1, parseInt(order, 10) || 1);
      await shiftOrdersForInsert(targetOrder);
    } else {
      targetOrder = await getNextOrder();
    }

    const sliderBanner = new SliderBanner({
      title: title || "",
      imageUrl: uploadResult.url,
      imageKey: uploadResult.key,
      order: targetOrder,
      isActive: parseBoolean(isActive),
    });

    await sliderBanner.save();

    return response.successResponse(
      res,
      sliderBanner,
      "Slider banner created successfully",
    );
  } catch (error) {
    console.error("Error creating slider banner:", error);

    if (uploadedKey) {
      try {
        await deleteFromR2(uploadedKey);
      } catch (cleanupError) {
        console.error("Error cleaning up R2 file:", cleanupError);
      }
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create slider banner",
      500,
    );
  }
};

/**
 * @route GET /api/admin/slider
 * @desc Get all slider banners
 */
const getSliderBanners = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "order",
      ascending = "asc",
    } = req.query;

    const pageSize = Math.min(parseInt(limit, 10), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    const [data, totalRecord, nextOrder] = await Promise.all([
      SliderBanner.find(query)
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      SliderBanner.countDocuments(query),
      getNextOrder(),
    ]);

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: parseInt(page, 10),
              per_page: pageSize,
              nextOrder,
            },
          ],
          data,
        },
      ],
      "Slider banners fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching slider banners:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch slider banners",
      500,
    );
  }
};

/**
 * @route PUT /api/admin/slider/:id
 * @desc Update slider banner
 */
const updateSliderBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, order, isActive, clearImage } = req.body;

    const sliderBanner = await SliderBanner.findById(id);

    if (!sliderBanner) {
      return response.errorResponse(res, {}, "Slider banner not found", 404);
    }

    const shouldClearImage =
      clearImage === true || clearImage === "true";

    if (req.file) {
      try {
        const uploadResult = await uploadToR2(req.file, "slider");

        if (sliderBanner.imageKey) {
          try {
            await deleteFromR2(sliderBanner.imageKey);
          } catch (deleteError) {
            console.error("Error deleting old image from R2:", deleteError);
          }
        }

        sliderBanner.imageUrl = uploadResult.url;
        sliderBanner.imageKey = uploadResult.key;
      } catch (uploadError) {
        return response.errorResponse(
          res,
          {},
          `Failed to upload image: ${uploadError.message}`,
          500,
        );
      }
    } else if (shouldClearImage) {
      if (sliderBanner.imageKey) {
        try {
          await deleteFromR2(sliderBanner.imageKey);
        } catch (deleteError) {
          console.error("Error deleting image from R2:", deleteError);
        }
      }
      sliderBanner.imageUrl = "";
      sliderBanner.imageKey = "";
    }

    if (!sliderBanner.imageUrl || !sliderBanner.imageKey) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image is required" }],
        "Image is required",
        400,
      );
    }

    if (title !== undefined) {
      sliderBanner.title = title;
    }

    if (order !== undefined && order !== "") {
      const newOrder = Math.max(1, parseInt(order, 10) || 1);
      const oldOrder = sliderBanner.order;
      if (newOrder !== oldOrder) {
        await applyOrderChange(id, oldOrder, newOrder);
        sliderBanner.order = newOrder;
      }
    }

    if (isActive !== undefined) {
      sliderBanner.isActive = parseBoolean(isActive, sliderBanner.isActive);
    }

    await sliderBanner.save();

    return response.successResponse(
      res,
      sliderBanner,
      "Slider banner updated successfully",
    );
  } catch (error) {
    console.error("Error updating slider banner:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update slider banner",
      500,
    );
  }
};

/**
 * @route DELETE /api/admin/slider/:id
 * @desc Delete slider banner
 */
const deleteSliderBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const sliderBanner = await SliderBanner.findById(id);

    if (!sliderBanner) {
      return response.errorResponse(res, {}, "Slider banner not found", 404);
    }

    const deletedOrder = sliderBanner.order;

    if (sliderBanner.imageKey) {
      try {
        await deleteFromR2(sliderBanner.imageKey);
      } catch (deleteError) {
        console.error("Error deleting image from R2:", deleteError);
      }
    }

    await SliderBanner.findByIdAndDelete(id);
    await shiftOrdersAfterDelete(deletedOrder);

    return response.successResponse(res, {}, "Slider banner deleted successfully");
  } catch (error) {
    console.error("Error deleting slider banner:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete slider banner",
      500,
    );
  }
};

/**
 * @route GET /api/admin/slider/hero-settings
 * @desc Get homepage hero overlay settings
 */
const getHeroSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const hero = normalizeHeroSettings(settings.hero);

    return response.successResponse(
      res,
      hero,
      "Hero settings fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching hero settings:", error);
    return response.errorResponse(res, {}, "Failed to fetch hero settings", 500);
  }
};

/**
 * @route PUT /api/admin/slider/hero-settings
 * @desc Update homepage hero overlay settings
 */
const updateHeroSettings = async (req, res) => {
  try {
    const { title, tagline, buttons } = req.body;
    const settings = await CommonSettings.getOrCreateSettings();

    let parsedButtons = buttons;
    if (typeof buttons === "string") {
      try {
        parsedButtons = JSON.parse(buttons);
      } catch (parseError) {
        return response.errorResponse(
          res,
          [{ path: "buttons", msg: "Invalid buttons format" }],
          "Invalid buttons format",
          400,
        );
      }
    }

    settings.hero = normalizeHeroSettings({
      title: title !== undefined ? title : settings.hero?.title,
      tagline: tagline !== undefined ? tagline : settings.hero?.tagline,
      buttons: parsedButtons !== undefined ? parsedButtons : settings.hero?.buttons,
    });
    settings.markModified("hero");
    await settings.save();

    return response.successResponse(
      res,
      normalizeHeroSettings(settings.hero),
      "Hero settings updated successfully",
    );
  } catch (error) {
    console.error("Error updating hero settings:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update hero settings",
      500,
    );
  }
};

/**
 * @route GET /api/common/slider-banners
 * @desc Get active slider banners (public)
 */
const getPublicSliderBanners = async (req, res) => {
  try {
    const sliderBanners = await SliderBanner.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select("title imageUrl order")
      .lean();

    return response.successResponse(
      res,
      sliderBanners,
      "Active slider banners fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching public slider banners:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch slider banners",
      500,
    );
  }
};

module.exports = {
  createSliderBanner,
  getSliderBanners,
  updateSliderBanner,
  deleteSliderBanner,
  getHeroSettings,
  updateHeroSettings,
  getPublicSliderBanners,
};
