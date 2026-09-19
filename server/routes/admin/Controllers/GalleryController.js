const response = require("../../../config/response");
const ImageGallery = require("../../../models/ImageGallery");
const CommonSettings = require("../../../models/CommonSettings");
const { uploadToR2, deleteFromR2 } = require("../../../helpers/r2Helper");
const {
  normalizeGallerySettings,
} = require("../../../utils/gallerySettingsHelpers");
const { MAX_GALLERY_BULK_UPLOAD } = require("../../../constants/imageUpload");

const DEFAULT_PUBLIC_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * @route POST /api/admin/gallery
 * @desc Upload a single gallery image
 */
const createGalleryImage = async (req, res) => {
  try {
    if (!req.file) {
      return response.errorResponse(
        res,
        [{ path: "image", msg: "Image is required" }],
        "Image is required",
        400
      );
    }

    const uploadResult = await uploadToR2(req.file, "gallery");

    const galleryImage = new ImageGallery({
      imageUrl: uploadResult.url,
      imageKey: uploadResult.key,
    });

    await galleryImage.save();

    return response.successResponse(
      res,
      galleryImage,
      "Gallery image uploaded successfully"
    );
  } catch (error) {
    console.error("Error creating gallery image:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to upload gallery image",
      500
    );
  }
};

const isRequestCancelled = (req) => Boolean(req.aborted);

const rollbackGalleryUploads = async (keys = []) => {
  await Promise.all(
    keys.map(async (key) => {
      if (!key) {
        return;
      }
      try {
        await deleteFromR2(key);
      } catch (rollbackError) {
        console.error("Error rolling back gallery image from R2:", rollbackError);
      }
    })
  );
};

/**
 * @route POST /api/admin/gallery/bulk
 * @desc Upload multiple gallery images at once
 */
const createGalleryImagesBulk = async (req, res) => {
  const uploadedKeys = [];
  let cancelled = false;

  const markCancelled = () => {
    cancelled = true;
  };

  // Only treat true client abort as cancel.
  // Do NOT listen to req "close" — multer finishes reading the body and that
  // fires close while R2 upload is still in progress (false positive).
  req.on("aborted", markCancelled);

  try {
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return response.errorResponse(
        res,
        [{ path: "images", msg: "At least one image is required" }],
        "At least one image is required",
        400
      );
    }

    if (files.length > MAX_GALLERY_BULK_UPLOAD) {
      return response.errorResponse(
        res,
        [
          {
            path: "images",
            msg: `You can upload up to ${MAX_GALLERY_BULK_UPLOAD} images at once`,
          },
        ],
        `Maximum ${MAX_GALLERY_BULK_UPLOAD} images allowed per upload`,
        400
      );
    }

    const uploadResults = await Promise.all(
      files.map(async (file, index) => {
        if (cancelled || isRequestCancelled(req)) {
          cancelled = true;
          return {
            ok: false,
            index,
            name: file.originalname,
            message: "Upload cancelled",
          };
        }

        try {
          const uploadResult = await uploadToR2(file, "gallery");
          uploadedKeys.push(uploadResult.key);

          if (cancelled || isRequestCancelled(req)) {
            cancelled = true;
            await deleteFromR2(uploadResult.key);
            return {
              ok: false,
              index,
              name: file.originalname,
              message: "Upload cancelled",
            };
          }

          return {
            ok: true,
            index,
            doc: {
              imageUrl: uploadResult.url,
              imageKey: uploadResult.key,
            },
          };
        } catch (uploadError) {
          return {
            ok: false,
            index,
            name: file.originalname,
            message: uploadError.message || "Upload failed",
          };
        }
      })
    );

    if (cancelled || isRequestCancelled(req)) {
      await rollbackGalleryUploads(uploadedKeys);
      if (!res.headersSent) {
        return response.errorResponse(
          res,
          {},
          "Upload cancelled. Cloudflare files were rolled back.",
          499
        );
      }
      return undefined;
    }

    const createdDocs = uploadResults
      .filter((result) => result.ok)
      .map((result) => result.doc);
    const failed = uploadResults
      .filter((result) => !result.ok)
      .map(({ index, name, message }) => ({ index, name, message }));

    let created = [];
    if (createdDocs.length > 0) {
      created = await ImageGallery.insertMany(createdDocs);
    }

    if (cancelled || isRequestCancelled(req)) {
      const keysToRollback = created
        .map((doc) => doc.imageKey)
        .concat(uploadedKeys);
      await ImageGallery.deleteMany({
        _id: { $in: created.map((doc) => doc._id) },
      });
      await rollbackGalleryUploads(keysToRollback);
      if (!res.headersSent) {
        return response.errorResponse(
          res,
          {},
          "Upload cancelled. Cloudflare files were rolled back.",
          499
        );
      }
      return undefined;
    }

    if (created.length === 0) {
      return response.errorResponse(
        res,
        failed.map((item) => ({
          path: `images.${item.index}`,
          msg: item.message,
        })),
        "Failed to upload gallery images",
        400
      );
    }

    return response.successResponse(
      res,
      { created, failed },
      failed.length
        ? `${created.length} image(s) uploaded, ${failed.length} failed`
        : `${created.length} image(s) uploaded successfully`
    );
  } catch (error) {
    if (cancelled || isRequestCancelled(req)) {
      await rollbackGalleryUploads(uploadedKeys);
      if (!res.headersSent) {
        return response.errorResponse(
          res,
          {},
          "Upload cancelled. Cloudflare files were rolled back.",
          499
        );
      }
      return undefined;
    }

    await rollbackGalleryUploads(uploadedKeys);
    console.error("Error bulk uploading gallery images:", error);
    if (!res.headersSent) {
      return response.errorResponse(
        res,
        {},
        error.message || "Failed to upload gallery images",
        500
      );
    }
    return undefined;
  }
};

/**
 * @route GET /api/admin/gallery
 * @desc Get paginated gallery images
 */
const getGalleryImages = async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
    } = req.query;

    const pageSize = Math.min(parsePositiveInt(limit, 20), MAX_PAGE_SIZE);
    const currentPage = parsePositiveInt(page, 1);
    const skip = pageSize * (currentPage - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;
    const allowedOrderFields = ["createdAt"];
    const sortField = allowedOrderFields.includes(orderBy)
      ? orderBy
      : "createdAt";

    const [data, totalRecord] = await Promise.all([
      ImageGallery.find({})
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      ImageGallery.countDocuments({}),
    ]);

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: currentPage,
              per_page: pageSize,
            },
          ],
          data,
        },
      ],
      "Gallery images fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch gallery images",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/gallery/:id
 * @desc Delete a single gallery image
 */
const deleteGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;

    const galleryImage = await ImageGallery.findById(id);

    if (!galleryImage) {
      return response.errorResponse(res, {}, "Gallery image not found", 404);
    }

    if (galleryImage.imageKey) {
      try {
        await deleteFromR2(galleryImage.imageKey);
      } catch (deleteError) {
        console.error("Error deleting image from R2:", deleteError);
        return response.errorResponse(
          res,
          {},
          "Failed to delete image from Cloudflare storage. Please try again.",
          500
        );
      }
    }

    await ImageGallery.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "Gallery image deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete gallery image",
      500
    );
  }
};

/**
 * @route DELETE /api/admin/gallery/bulk
 * @desc Delete multiple gallery images
 */
const deleteGalleryImagesBulk = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

    if (ids.length === 0) {
      return response.errorResponse(
        res,
        [{ path: "ids", msg: "Select at least one image to delete" }],
        "Select at least one image to delete",
        400
      );
    }

    const galleryImages = await ImageGallery.find({ _id: { $in: ids } }).lean();

    if (galleryImages.length === 0) {
      return response.errorResponse(res, {}, "No gallery images found", 404);
    }

    const deletedIds = [];
    const failed = [];

    for (const image of galleryImages) {
      try {
        if (image.imageKey) {
          await deleteFromR2(image.imageKey);
        }
        await ImageGallery.findByIdAndDelete(image._id);
        deletedIds.push(image._id);
      } catch (deleteError) {
        console.error("Error deleting gallery image:", deleteError);
        failed.push({
          id: image._id,
          message: deleteError.message || "Failed to delete from Cloudflare",
        });
      }
    }

    if (deletedIds.length === 0) {
      return response.errorResponse(
        res,
        failed.map((item) => ({
          path: String(item.id),
          msg: item.message,
        })),
        "Failed to delete gallery images from Cloudflare storage",
        500
      );
    }

    return response.successResponse(
      res,
      {
        deletedCount: deletedIds.length,
        failed,
      },
      failed.length
        ? `${deletedIds.length} image(s) deleted, ${failed.length} failed (Cloudflare)`
        : `${deletedIds.length} image(s) deleted successfully`
    );
  } catch (error) {
    console.error("Error bulk deleting gallery images:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to delete gallery images",
      500
    );
  }
};

/**
 * @route GET /api/admin/gallery/settings
 * @desc Get gallery section settings (title & description)
 */
const getGallerySettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const gallery = normalizeGallerySettings(settings.gallery);

    return response.successResponse(
      res,
      gallery,
      "Gallery settings fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching gallery settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch gallery settings",
      500
    );
  }
};

/**
 * @route PUT /api/admin/gallery/settings
 * @desc Update gallery section settings
 */
const updateGallerySettings = async (req, res) => {
  try {
    const { title, description } = req.body;
    const settings = await CommonSettings.getOrCreateSettings();

    settings.gallery = normalizeGallerySettings({
      title: title !== undefined ? title : settings.gallery?.title,
      description:
        description !== undefined
          ? description
          : settings.gallery?.description,
    });
    settings.markModified("gallery");
    await settings.save();

    return response.successResponse(
      res,
      normalizeGallerySettings(settings.gallery),
      "Gallery settings updated successfully"
    );
  } catch (error) {
    console.error("Error updating gallery settings:", error);
    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update gallery settings",
      500
    );
  }
};

/**
 * @route GET /api/common/gallery/settings
 * @desc Get public gallery section settings
 */
const getPublicGallerySettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const gallery = normalizeGallerySettings(settings.gallery);

    return response.successResponse(
      res,
      gallery,
      "Gallery settings fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public gallery settings:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch gallery settings",
      500
    );
  }
};

/**
 * @route GET /api/common/gallery
 * @desc Get paginated gallery images (public)
 */
const getPublicGalleryImages = async (req, res) => {
  try {
    const { limit = DEFAULT_PUBLIC_PAGE_SIZE, page = 1 } = req.query;

    const pageSize = Math.min(
      parsePositiveInt(limit, DEFAULT_PUBLIC_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const currentPage = parsePositiveInt(page, 1);
    const skip = pageSize * (currentPage - 1);

    const [data, totalRecord] = await Promise.all([
      ImageGallery.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .select("imageUrl createdAt")
        .lean(),
      ImageGallery.countDocuments({}),
    ]);

    return response.successResponse(
      res,
      {
        data,
        metadata: {
          totalRecord,
          current_page: currentPage,
          per_page: pageSize,
          total_pages: Math.ceil(totalRecord / pageSize) || 0,
          has_more: skip + data.length < totalRecord,
        },
      },
      "Gallery images fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching public gallery images:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch gallery images",
      500
    );
  }
};

module.exports = {
  createGalleryImage,
  createGalleryImagesBulk,
  getGalleryImages,
  deleteGalleryImage,
  deleteGalleryImagesBulk,
  getGallerySettings,
  updateGallerySettings,
  getPublicGallerySettings,
  getPublicGalleryImages,
};
