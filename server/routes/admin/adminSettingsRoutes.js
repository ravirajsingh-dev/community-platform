const express = require("express");
const router = express.Router();
const multer = require("multer");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const { checkAnyHierarchyPermission } = require("../../middleware/checkAnyHierarchyPermission");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  getCommonSettings,
  updateCommonSettings,
  updateMembershipSettings,
} = require("./Controllers/AdminSettingsController");
const {
  getHierarchySettings,
  updateHierarchySettings,
} = require("./Controllers/HierarchySettingsController");
const { MAX_IMAGE_SIZE_BYTES } = require("../../constants/imageUpload");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    require("path").extname(file.originalname).toLowerCase(),
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

// @route GET api/admin/settings
// @desc Get common settings (auto-creates if not found)
// @access Private (Admin only)
router.get("/settings", [], getCommonSettings);

// @route PUT api/admin/settings
// @desc Update common settings
// @access Private (Admin only)
router.put(
  "/settings",
  [AdminAuth, checkPermission("application-settings")],
  upload.any(),
  updateCommonSettings,
);

// @route PUT api/admin/membership-settings
// @desc Update auth / payment gateway / referral settings
// @access Private (membership-plans settings)
router.put(
  "/membership-settings",
  [
    AdminAuth,
    checkPermission("membership-plans", "settings"),
    upload.any(),
    verifyTransactionPassword,
  ],
  updateMembershipSettings,
);

// @route GET api/admin/settings/hierarchy
// @desc Get hierarchy master settings (user creatable levels)
// @access Private (Admin / sub-admin with hierarchy edit)
router.get(
  "/settings/hierarchy",
  [AdminAuth, checkAnyHierarchyPermission("edit")],
  getHierarchySettings,
);

// @route PUT api/admin/settings/hierarchy
// @desc Update hierarchy master settings
// @access Private (Admin / sub-admin with hierarchy edit)
router.put(
  "/settings/hierarchy",
  [
    AdminAuth,
    checkAnyHierarchyPermission("edit"),
    verifyTransactionPassword,
  ],
  updateHierarchySettings,
);

module.exports = router;
