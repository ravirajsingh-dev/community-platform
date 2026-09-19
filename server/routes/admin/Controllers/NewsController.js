const response = require("../../../config/response");
const News = require("../../../models/News");
const CommonSettings = require("../../../models/CommonSettings");
const { uploadToR2, deleteFromR2 } = require("../../../helpers/r2Helper");
const {
  normalizeNewsSettings,
} = require("../../../utils/newsSettingsHelpers");
const { MAX_NEWS_IMAGES } = require("../../../constants/imageUpload");

const getNextOrder = async () => {
  const maxNews = await News.findOne()
    .sort({ displayOrder: -1 })
    .select("displayOrder")
    .lean();
  return (maxNews?.displayOrder ?? 0) + 1;
};

const shiftOrdersForInsert = async (targetOrder, excludeId = null) => {
  const filter = { displayOrder: { $gte: targetOrder } };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  await News.updateMany(filter, { $inc: { displayOrder: 1 } });
};

const applyOrderChange = async (newsId, oldOrder, newOrder) => {
  if (oldOrder === newOrder) {
    return;
  }

  if (newOrder < oldOrder) {
    await News.updateMany(
      {
        _id: { $ne: newsId },
        displayOrder: { $gte: newOrder, $lt: oldOrder },
      },
      { $inc: { displayOrder: 1 } }
    );
  } else {
    await News.updateMany(
      {
        _id: { $ne: newsId },
        displayOrder: { $gt: oldOrder, $lte: newOrder },
      },
      { $inc: { displayOrder: -1 } }
    );
  }
};

const normalizeDisplayOrders = async () => {
  const items = await News.find()
    .sort({ displayOrder: 1, createdAt: -1 })
    .select("_id displayOrder")
    .lean();

  const updates = [];
  items.forEach((item, index) => {
    const expectedOrder = index + 1;
    if (item.displayOrder !== expectedOrder) {
      updates.push(
        News.updateOne({ _id: item._id }, { displayOrder: expectedOrder })
      );
    }
  });

  if (updates.length) {
    await Promise.all(updates);
  }
};

const collectImageKeys = (news) => {
  const keys = [];
  if (Array.isArray(news.images)) {
    news.images.forEach((img) => {
      if (img?.imageKey) keys.push(img.imageKey);
    });
  }
  if (news.imageKey) keys.push(news.imageKey);
  return [...new Set(keys)];
};

const resolveNewsImages = (news) => {
  if (Array.isArray(news.images) && news.images.length > 0) {
    return news.images
      .filter((img) => img?.imageUrl)
      .map((img) => ({
        imageUrl: img.imageUrl,
        imageKey: img.imageKey || null,
      }));
  }
  if (news.imageUrl) {
    return [
      {
        imageUrl: news.imageUrl,
        imageKey: news.imageKey || null,
      },
    ];
  }
  return [];
};

const parseExistingImages = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((img) => img && img.imageUrl)
      .map((img) => ({
        imageUrl: String(img.imageUrl),
        imageKey: img.imageKey ? String(img.imageKey) : null,
      }));
  } catch {
    return [];
  }
};

const uploadNewsFiles = async (files = []) => {
  if (!files.length) {
    return [];
  }

  // Upload in parallel (same pattern as Gallery bulk) instead of one-by-one.
  return Promise.all(
    files.map(async (file) => {
      const uploadResult = await uploadToR2(file, "news");
      return {
        imageUrl: uploadResult.url,
        imageKey: uploadResult.key,
      };
    })
  );
};

const deleteKeysSafely = async (keys = []) => {
  await Promise.all(
    keys.map(async (key) => {
      if (!key) return;
      try {
        await deleteFromR2(key);
      } catch (deleteError) {
        console.error("Error deleting image from R2:", deleteError);
      }
    })
  );
};

/**
 * @route POST /api/admin/news
 * @desc Create a new news item
 */
const createNews = async (req, res) => {
  try {
    const { title, description, displayOrder, isActive } = req.body;

    if (!title || !description) {
      return response.errorResponse(
        res,
        [{ path: "title", msg: "Title and description are required" }],
        "Title and description are required",
        400
      );
    }

    const files = req.files || [];
    if (files.length > MAX_NEWS_IMAGES) {
      return response.errorResponse(
        res,
        [
          {
            path: "images",
            msg: `You can upload up to ${MAX_NEWS_IMAGES} images`,
          },
        ],
        `You can upload up to ${MAX_NEWS_IMAGES} images`,
        400
      );
    }

    let images = [];
    if (files.length > 0) {
      images = await uploadNewsFiles(files);
    }

    let targetOrder;
    if (
      displayOrder !== undefined &&
      displayOrder !== "" &&
      displayOrder !== null
    ) {
      targetOrder = Math.max(1, parseInt(displayOrder, 10) || 1);
      await shiftOrdersForInsert(targetOrder);
    } else {
      targetOrder = await getNextOrder();
    }

    const primary = images[0] || null;

    const news = new News({
      title: title.trim(),
      description: description.trim(),
      images,
      imageUrl: primary?.imageUrl || null,
      imageKey: primary?.imageKey || null,
      displayOrder: targetOrder,
      isActive:
        isActive !== undefined
          ? isActive === "true" || isActive === true
          : true,
      createdBy: req.user.id,
    });

    await news.save();

    return response.successResponse(res, news, "News created successfully");
  } catch (error) {
    console.error("Error creating news:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create news",
      500
    );
  }
};

/**
 * @route GET /api/admin/news
 * @desc Get all news items
 */
const getNews = async (req, res) => {
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
      News.find(query)
        .populate("createdBy", "name email")
        .sort({ [orderBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      News.countDocuments(query),
      getNextOrder(),
    ]);

    const normalizedData = data.map((item) => ({
      ...item,
      images: resolveNewsImages(item),
      imageUrl: resolveNewsImages(item)[0]?.imageUrl || item.imageUrl || null,
    }));

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
          data: normalizedData,
        },
      ],
      "News fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching news:", error);
    return response.errorResponse(res, {}, "Failed to fetch news", 500);
  }
};

/**
 * @route GET /api/admin/news/:id
 * @desc Get news by ID
 */
const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!news) {
      return response.errorResponse(res, {}, "News not found", 404);
    }

    const images = resolveNewsImages(news);

    return response.successResponse(
      res,
      {
        ...news,
        images,
        imageUrl: images[0]?.imageUrl || news.imageUrl || null,
      },
      "News fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching news:", error);
    return response.errorResponse(res, {}, "Failed to fetch news", 500);
  }
};

/**
 * @route PUT /api/admin/news/:id
 * @desc Update news
 */
const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, displayOrder, isActive, existingImages } =
      req.body;

    const news = await News.findById(id);

    if (!news) {
      return response.errorResponse(res, {}, "News not found", 404);
    }

    if (title !== undefined) news.title = title.trim();
    if (description !== undefined) news.description = description.trim();

    if (displayOrder !== undefined && displayOrder !== "") {
      const newOrder = Math.max(1, parseInt(displayOrder, 10) || 1);
      const oldOrder = news.displayOrder;
      if (newOrder !== oldOrder) {
        await applyOrderChange(id, oldOrder, newOrder);
        news.displayOrder = newOrder;
      }
    }

    if (isActive !== undefined) {
      news.isActive = isActive === "true" || isActive === true;
    }

    const previousImages = resolveNewsImages(news);
    const keptImages = parseExistingImages(existingImages);
    const newFiles = req.files || [];

    if (
      keptImages.length + newFiles.length > MAX_NEWS_IMAGES
    ) {
      return response.errorResponse(
        res,
        [
          {
            path: "images",
            msg: `You can have up to ${MAX_NEWS_IMAGES} images per news item`,
          },
        ],
        `You can have up to ${MAX_NEWS_IMAGES} images per news item`,
        400
      );
    }

    const uploadedImages =
      newFiles.length > 0 ? await uploadNewsFiles(newFiles) : [];

    const finalImages = [...keptImages, ...uploadedImages];
    news.images = finalImages;
    news.imageUrl = finalImages[0]?.imageUrl || null;
    news.imageKey = finalImages[0]?.imageKey || null;

    const keptKeys = new Set(keptImages.map((img) => img.imageKey).filter(Boolean));
    const removedKeys = previousImages
      .map((img) => img.imageKey)
      .filter((key) => key && !keptKeys.has(key));

    await news.save();
    await deleteKeysSafely(removedKeys);

    return response.successResponse(res, news, "News updated successfully");
  } catch (error) {
    console.error("Error updating news:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update news",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/news/:id
 * @desc Delete news
 */
const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id);

    if (!news) {
      return response.errorResponse(res, {}, "News not found", 404);
    }

    const keys = collectImageKeys(news);
    await News.findByIdAndDelete(id);
    await normalizeDisplayOrders();
    await deleteKeysSafely(keys);

    return response.successResponse(res, {}, "News deleted successfully");
  } catch (error) {
    console.error("Error deleting news:", error);
    return response.errorResponse(res, {}, "Failed to delete news", 500);
  }
};

/**
 * @route GET /api/common/news
 * @desc Get active news items (public)
 */
const getPublicNews = async (req, res) => {
  try {
    const news = await News.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select("title description images imageUrl displayOrder createdAt")
      .lean();

    const normalized = news.map((item) => {
      const images = resolveNewsImages(item);
      return {
        ...item,
        images,
        imageUrl: images[0]?.imageUrl || item.imageUrl || null,
      };
    });

    return response.successResponse(
      res,
      normalized,
      "Active news fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public news:", error);
    return response.errorResponse(res, {}, "Failed to fetch news", 500);
  }
};

/**
 * @route GET /api/admin/news/settings
 * @desc Get news section settings (title & description)
 */
const getNewsSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const news = normalizeNewsSettings(settings.news);

    return response.successResponse(
      res,
      news,
      "News settings fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching news settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch news settings",
      500
    );
  }
};

/**
 * @route PUT /api/admin/news/settings
 * @desc Update news section settings
 */
const updateNewsSettings = async (req, res) => {
  try {
    const { title, description } = req.body;
    const settings = await CommonSettings.getOrCreateSettings();

    settings.news = normalizeNewsSettings({
      title: title !== undefined ? title : settings.news?.title,
      description:
        description !== undefined
          ? description
          : settings.news?.description,
    });
    settings.markModified("news");
    await settings.save();

    return response.successResponse(
      res,
      normalizeNewsSettings(settings.news),
      "News settings updated successfully"
    );
  } catch (error) {
    console.error("Error updating news settings:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update news settings",
      500
    );
  }
};

/**
 * @route GET /api/common/news/settings
 * @desc Get public news section settings
 */
const getPublicNewsSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const news = normalizeNewsSettings(settings.news);

    return response.successResponse(
      res,
      news,
      "News settings fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public news settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch news settings",
      500
    );
  }
};

module.exports = {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews,
  getPublicNews,
  getNewsSettings,
  updateNewsSettings,
  getPublicNewsSettings,
};
