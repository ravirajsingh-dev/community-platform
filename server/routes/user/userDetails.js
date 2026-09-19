const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

const {
  getUserDetails,
  createOrUpdateUserDetails,
  getUserWithDetails,
} = require("./Controllers/UserDetailsController");
const { userProtected } = require("../../middleware/userProtected");

// @route GET api/users/details
// @desc Get user details
// @access Private
router.get("/details", ...userProtected, getUserDetails);

// @route GET api/users/user-with-details
// @desc Get user with details combined
// @access Private
router.get(
  "/user-with-details",
  ...userProtected,
  getUserWithDetails
);

// @route POST api/users/details
// @desc Create or update user details
// @access Private
router.post(
  "/details",
  ...userProtected,
  [
    check("gender", "Gender must be one of: male, female, other")
      .optional()
      .isIn(["male", "female", "other"]),
    check("maritalStatus", "Marital status must be married or unmarried")
      .optional()
      .isIn(["married", "unmarried"]),
    check("countryCode", "Only India (IN) is supported")
      .optional()
      .custom((value) => {
        if (value == null || value === "") return true;
        return String(value).trim() === "IN";
      }),
    check("stateCode", "State code is required")
      .optional()
      .isString()
      .isLength({ min: 1, max: 10 }),
    check("cityId", "City ID is required")
      .optional()
      .isString()
      .isLength({ min: 1, max: 32 }),
  ],
  createOrUpdateUserDetails
);

// @route PUT api/users/details
// @desc Update user details
// @access Private
router.put(
  "/details",
  ...userProtected,
  [
    check("gender", "Gender must be one of: male, female, other")
      .optional()
      .isIn(["male", "female", "other"]),
    check("maritalStatus", "Marital status must be married or unmarried")
      .optional()
      .isIn(["married", "unmarried"]),
    check("countryCode", "Only India (IN) is supported")
      .optional()
      .custom((value) => {
        if (value == null || value === "") return true;
        return String(value).trim() === "IN";
      }),
    check("stateCode", "State code is required")
      .optional()
      .isString()
      .isLength({ min: 1, max: 10 }),
    check("cityId", "City ID is required")
      .optional()
      .isString()
      .isLength({ min: 1, max: 32 }),
  ],
  createOrUpdateUserDetails
);

module.exports = router;
