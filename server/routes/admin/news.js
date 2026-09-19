const express = require("express");
const router = express.Router();
const multer = require("multer");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews,
  getNewsSettings,
  updateNewsSettings,
} = require("./Controllers/NewsController");
const {
  MAX_IMAGE_SIZE_BYTES,
  MAX_NEWS_IMAGES,
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
  storage: storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter: fileFilter,
});

// @route POST api/admin/news
// @desc Create a new news item (supports multiple images)
// @access Private (Admin)
router.post(
  "/",
  [AdminAuth, checkPermission("news", "create")],
  upload.array("images", MAX_NEWS_IMAGES),
  createNews
);

// @route GET api/admin/news
// @desc Get all news items
// @access Private (Admin)
router.get("/", [AdminAuth, checkPermission("news", "list")], getNews);

// @route GET api/admin/news/settings
// @desc Get news section settings
// @access Private (Admin)
router.get(
  "/settings",
  [AdminAuth, checkPermission("news", "list")],
  getNewsSettings
);

// @route PUT api/admin/news/settings
// @desc Update news section settings
// @access Private (Admin)
router.put(
  "/settings",
  [AdminAuth, checkPermission("news", "edit"), verifyTransactionPassword],
  updateNewsSettings
);

// @route GET api/admin/news/:id
// @desc Get news by ID
// @access Private (Admin)
router.get("/:id", [AdminAuth, checkPermission("news", "list")], getNewsById);

// @route PUT api/admin/news/:id
// @desc Update news
// @access Private (Admin)
router.put(
  "/:id",
  [
    AdminAuth,
    checkPermission("news", "edit"),
    upload.array("images", MAX_NEWS_IMAGES),
    verifyTransactionPassword,
  ],
  updateNews
);

// @route DELETE api/admin/news/:id
// @desc Delete news
// @access Private (Admin)
router.delete(
  "/:id",
  [AdminAuth, checkPermission("news", "delete"), verifyTransactionPassword],
  deleteNews
);

module.exports = router;
