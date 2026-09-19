const express = require("express");
const router = express.Router();
const multer = require("multer");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createGalleryImage,
  createGalleryImagesBulk,
  getGalleryImages,
  deleteGalleryImage,
  deleteGalleryImagesBulk,
  getGallerySettings,
  updateGallerySettings,
} = require("./Controllers/GalleryController");
const {
  MAX_IMAGE_SIZE_BYTES,
  MAX_GALLERY_BULK_UPLOAD,
} = require("../../constants/imageUpload");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    require("path").extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }

  cb(new Error("Only jpg, jpeg, png, and webp images are allowed!"));
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter,
});

// @route GET api/admin/gallery/settings
// @desc Get gallery section settings
// @access Private (Admin)
router.get(
  "/settings",
  [AdminAuth, checkPermission("gallery", "list")],
  getGallerySettings
);

// @route PUT api/admin/gallery/settings
// @desc Update gallery section settings
// @access Private (Admin)
router.put(
  "/settings",
  [AdminAuth, checkPermission("gallery", "edit"), verifyTransactionPassword],
  updateGallerySettings
);

// @route POST api/admin/gallery/bulk
// @desc Upload multiple gallery images
// @access Private (Admin)
router.post(
  "/bulk",
  [AdminAuth, checkPermission("gallery", "create")],
  upload.array("images", MAX_GALLERY_BULK_UPLOAD),
  createGalleryImagesBulk
);

// @route DELETE api/admin/gallery/bulk
// @desc Delete multiple gallery images
// @access Private (Admin)
router.delete(
  "/bulk",
  [AdminAuth, checkPermission("gallery", "delete"), verifyTransactionPassword],
  deleteGalleryImagesBulk
);

// @route POST api/admin/gallery
// @desc Upload a single gallery image
// @access Private (Admin)
router.post(
  "/",
  [AdminAuth, checkPermission("gallery", "create")],
  upload.single("image"),
  createGalleryImage
);

// @route GET api/admin/gallery
// @desc Get paginated gallery images
// @access Private (Admin)
router.get("/", [AdminAuth, checkPermission("gallery", "list")], getGalleryImages);

// @route DELETE api/admin/gallery/:id
// @desc Delete a single gallery image
// @access Private (Admin)
router.delete(
  "/:id",
  [AdminAuth, checkPermission("gallery", "delete"), verifyTransactionPassword],
  deleteGalleryImage
);

module.exports = router;
