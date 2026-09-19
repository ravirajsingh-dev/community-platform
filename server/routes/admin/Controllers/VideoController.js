const response = require("../../../config/response");
const Video = require("../../../models/Video");
const CommonSettings = require("../../../models/CommonSettings");
const {
  normalizeVideoSettings,
} = require("../../../utils/videoSettingsHelpers");

const getNextOrder = async () => {
  const maxVideo = await Video.findOne()
    .sort({ displayOrder: -1 })
    .select("displayOrder")
    .lean();
  return (maxVideo?.displayOrder ?? 0) + 1;
};

const shiftOrdersForInsert = async (targetOrder, excludeId = null) => {
  const filter = { displayOrder: { $gte: targetOrder } };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  await Video.updateMany(filter, { $inc: { displayOrder: 1 } });
};

const applyOrderChange = async (videoId, oldOrder, newOrder) => {
  if (oldOrder === newOrder) {
    return;
  }

  if (newOrder < oldOrder) {
    await Video.updateMany(
      {
        _id: { $ne: videoId },
        displayOrder: { $gte: newOrder, $lt: oldOrder },
      },
      { $inc: { displayOrder: 1 } },
    );
  } else {
    await Video.updateMany(
      {
        _id: { $ne: videoId },
        displayOrder: { $gt: oldOrder, $lte: newOrder },
      },
      { $inc: { displayOrder: -1 } },
    );
  }
};

const normalizeDisplayOrders = async () => {
  const videos = await Video.find()
    .sort({ displayOrder: 1, createdAt: -1 })
    .select("_id displayOrder")
    .lean();

  const updates = [];
  videos.forEach((video, index) => {
    const expectedOrder = index + 1;
    if (video.displayOrder !== expectedOrder) {
      updates.push(
        Video.updateOne({ _id: video._id }, { displayOrder: expectedOrder }),
      );
    }
  });

  if (updates.length) {
    await Promise.all(updates);
  }
};

/**
 * @route POST /api/admin/video
 * @desc Create a new video
 */
const createVideo = async (req, res) => {
  try {
    const { title, embedUrl, displayOrder, isActive } = req.body;

    if (!title || !embedUrl) {
      return response.errorResponse(
        res,
        [{ path: "title", msg: "Title and embed URL are required" }],
        "Title and embed URL are required",
        400
      );
    }

    let targetOrder;
    if (displayOrder !== undefined && displayOrder !== "" && displayOrder !== null) {
      targetOrder = Math.max(1, parseInt(displayOrder, 10) || 1);
      await shiftOrdersForInsert(targetOrder);
    } else {
      targetOrder = await getNextOrder();
    }

    const video = new Video({
      title: title.trim(),
      embedUrl: embedUrl.trim(),
      displayOrder: targetOrder,
      isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
      createdBy: req.user.id,
    });

    await video.save();

    return response.successResponse(
      res,
      video,
      "Video created successfully"
    );
  } catch (error) {
    console.error("Error creating video:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create video",
      500
    );
  }
};

/**
 * @route GET /api/admin/video
 * @desc Get all videos
 */
const getVideos = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "displayOrder",
      ascending = "asc",
    } = req.query;

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const query = {};

    await normalizeDisplayOrders();

    const [data, totalRecord, nextOrder] = await Promise.all([
      Video.find(query)
        .populate("createdBy", "name email")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Video.countDocuments(query),
      getNextOrder(),
    ]);

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: parseInt(page),
              per_page: pageSize,
              nextOrder,
            },
          ],
          data,
        },
      ],
      "Videos fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching videos:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch videos",
      500
    );
  }
};

/**
 * @route GET /api/admin/video/:id
 * @desc Get video by ID
 */
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!video) {
      return response.errorResponse(
        res,
        {},
        "Video not found",
        404
      );
    }

    return response.successResponse(
      res,
      video,
      "Video fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching video:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch video",
      500
    );
  }
};

/**
 * @route PUT /api/admin/video/:id
 * @desc Update video
 */
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, embedUrl, displayOrder, isActive } = req.body;

    const video = await Video.findById(id);

    if (!video) {
      return response.errorResponse(
        res,
        {},
        "Video not found",
        404
      );
    }

    if (title !== undefined) video.title = title.trim();
    if (embedUrl !== undefined) video.embedUrl = embedUrl.trim();

    if (displayOrder !== undefined && displayOrder !== "") {
      const newOrder = Math.max(1, parseInt(displayOrder, 10) || 1);
      const oldOrder = video.displayOrder;
      if (newOrder !== oldOrder) {
        await applyOrderChange(id, oldOrder, newOrder);
        video.displayOrder = newOrder;
      }
    }

    if (isActive !== undefined) {
      video.isActive = isActive === "true" || isActive === true;
    }

    await video.save();

    return response.successResponse(
      res,
      video,
      "Video updated successfully"
    );
  } catch (error) {
    console.error("Error updating video:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update video",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/video/:id
 * @desc Delete video
 */
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);

    if (!video) {
      return response.errorResponse(
        res,
        {},
        "Video not found",
        404
      );
    }

    await Video.findByIdAndDelete(id);
    await normalizeDisplayOrders();

    return response.successResponse(
      res,
      {},
      "Video deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting video:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete video",
      500
    );
  }
};

/**
 * @route GET /api/common/videos
 * @desc Get active videos (public)
 */
const getPublicVideos = async (req, res) => {
  try {
    const videos = await Video.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select("title embedUrl displayOrder")
      .lean();

    return response.successResponse(
      res,
      videos,
      "Active videos fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public videos:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch videos",
      500
    );
  }
};

/**
 * @route GET /api/admin/video/settings
 * @desc Get video section settings (title & description)
 */
const getVideoSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const video = normalizeVideoSettings(settings.video);

    return response.successResponse(
      res,
      video,
      "Video settings fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching video settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch video settings",
      500
    );
  }
};

/**
 * @route PUT /api/admin/video/settings
 * @desc Update video section settings
 */
const updateVideoSettings = async (req, res) => {
  try {
    const { title, description } = req.body;
    const settings = await CommonSettings.getOrCreateSettings();

    settings.video = normalizeVideoSettings({
      title: title !== undefined ? title : settings.video?.title,
      description:
        description !== undefined
          ? description
          : settings.video?.description,
    });
    settings.markModified("video");
    await settings.save();

    return response.successResponse(
      res,
      normalizeVideoSettings(settings.video),
      "Video settings updated successfully"
    );
  } catch (error) {
    console.error("Error updating video settings:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update video settings",
      500
    );
  }
};

/**
 * @route GET /api/common/videos/settings
 * @desc Get public video section settings
 */
const getPublicVideoSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const video = normalizeVideoSettings(settings.video);

    return response.successResponse(
      res,
      video,
      "Video settings fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public video settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch video settings",
      500
    );
  }
};

module.exports = {
  createVideo,
  getVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  getPublicVideos,
  getVideoSettings,
  updateVideoSettings,
  getPublicVideoSettings,
};
