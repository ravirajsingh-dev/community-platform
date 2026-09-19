const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const { AdminAuth } = require("../../middleware/auth");
const {
  validateEmailField,
  validatePhoneField,
} = require("../../middleware/inputValidation");
const {
  getMyProfile,
  updateMyProfile,
} = require("./Controllers/AdminProfileController");

router.get("/profile/me", AdminAuth, getMyProfile);

router.put(
  "/profile/me",
  [
    AdminAuth,
    check("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Name is required.")
      .isLength({ min: 3, max: 50 })
      .withMessage("Name must be between 3 and 50 characters."),
    validatePhoneField("phone"),
    validateEmailField("email"),
  ],
  updateMyProfile,
);

module.exports = router;
