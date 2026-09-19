const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const {
  validatePhoneField,
  validateEmailField,
  validateReferralIdField,
} = require("../../../middleware/inputValidation");

const { register } = require("./Controllers/RegisterController");
const { getReferralUserDetails } = require("./Controllers/AuthController");

// @route GET api/auth/users/referral/:referral_id
// @desc Lookup active referrer by Member ID (public, for register preview)
// @access Public
router.get("/referral/:referral_id", getReferralUserDetails);

router.post(
  "/register",
  [
    check("name", "Name is required")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 150 })
      .custom((value) => {
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Name cannot contain HTML or script tags");
        }
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Name contains invalid characters");
        }
        return true;
      }),

    validatePhoneField("phone"),

    validateEmailField("email"),

    check("planId", "Membership plan is required").isMongoId(),

    check("community", "Community is required").isMongoId(),

    check("password", "Password must be at least 4 characters long")
      .isLength({ min: 4 })
      .custom((value) => {
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),

    validateReferralIdField("referralId"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await register(req, res);
    } catch (error) {
      console.error("Error handling user registration:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

module.exports = router;
