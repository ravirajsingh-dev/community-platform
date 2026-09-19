const express = require("express");
const router = express.Router();
const multer = require("multer");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  createSliderBanner,
  getSliderBanners,
  updateSliderBanner,
  deleteSliderBanner,
  getHeroSettings,
  updateHeroSettings,
} = require("./Controllers/SliderController");
const { MAX_IMAGE_SIZE_BYTES } = require("../../constants/imageUpload");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    require("path").extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only jpg, jpeg, png, and webp images are allowed!"));
  }
};

// Multer middleware configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter: fileFilter,
});

// @route GET api/admin/slider/hero-settings
// @desc Get homepage hero overlay settings
// @access Private (Admin)
router.get(
  "/hero-settings",
  [AdminAuth, checkPermission("slider", "list")],
  getHeroSettings,
);

// @route PUT api/admin/slider/hero-settings
// @desc Update homepage hero overlay settings
// @access Private (Admin)
router.put(
  "/hero-settings",
  [AdminAuth, checkPermission("slider", "edit"), verifyTransactionPassword],
  updateHeroSettings,
);

// @route POST api/admin/slider
// @desc Create a new slider banner
// @access Private (Admin)
router.post("/", [AdminAuth, checkPermission("slider", "create")], upload.single("image"), createSliderBanner);

// @route GET api/admin/slider
// @desc Get all slider banners
// @access Private (Admin)
router.get("/", [AdminAuth, checkPermission("slider", "list")], getSliderBanners);

// @route PUT api/admin/slider/:id
// @desc Update slider banner
// @access Private (Admin)
router.put("/:id", [AdminAuth, checkPermission("slider", "edit"), verifyTransactionPassword], upload.single("image"), updateSliderBanner);

// @route DELETE api/admin/slider/:id
// @desc Delete slider banner
// @access Private (Admin)
router.delete("/:id", [AdminAuth, checkPermission("slider", "delete"), verifyTransactionPassword], deleteSliderBanner);

module.exports = router;

