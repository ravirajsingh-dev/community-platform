const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  getHowItWorksSettings,
  updateHowItWorksSettings,
} = require("./Controllers/HowItWorksController");

// @route GET api/admin/how-it-works/settings
// @desc Get How Our Platform Works section settings
// @access Private (Admin)
router.get(
  "/settings",
  [AdminAuth, checkPermission("how-it-works", "list")],
  getHowItWorksSettings
);

// @route PUT api/admin/how-it-works/settings
// @desc Update How Our Platform Works section settings
// @access Private (Admin)
router.put(
  "/settings",
  [AdminAuth, checkPermission("how-it-works", "edit"), verifyTransactionPassword],
  updateHowItWorksSettings
);

module.exports = router;
