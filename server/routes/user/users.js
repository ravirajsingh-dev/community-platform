const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const { userAuth, userProtected } = require("../../middleware/userProtected");
const { validateEducationInput } = require("../../utils/educationHelper");
const {
  updateUserById,
  updateAvatarByUserId,
} = require("./Controllers/UserController");
const {
  getProfile,
  updateProfile,
  getProfileRequirements,
} = require("./Controllers/ProfileController");
const {
  searchMembers,
  getMemberDetailsById,
} = require("./Controllers/SearchMemberController");
const {
  getMembership,
  getMembershipPayments,
  renewMembership,
} = require("./Controllers/MembershipController");
const {
  getWallet,
  getDirectReferrals,
  createUserFromWallet,
} = require("./Controllers/WalletController");
const User = require("../../models/User");
const {
  validateEmailField,
  validatePhoneField,
} = require("../../middleware/inputValidation");

// @route GET api/users/membership/payments
// @desc Get paginated membership payment history
// @access Private (auth only — expired users can view)
router.get("/membership/payments", userAuth, getMembershipPayments);

// @route GET api/users/membership
// @desc Get current membership status and history
// @access Private (auth only — expired users can view)
router.get("/membership", userAuth, getMembership);

// @route GET api/users/wallet
// @desc Get own wallet balance + transaction history
// @access Private (auth only — expired users can view)
router.get("/wallet", userAuth, getWallet);

// @route POST api/users/wallet/create-user
// @desc Create a new member using wallet balance (plan activated immediately)
// @access Private (active membership required)
router.post(
  "/wallet/create-user",
  [
    ...userProtected,
    check("name", "Name is required")
      .isString()
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 50 })
      .withMessage("Name must be between 3 and 50 characters")
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
    check("email", "Email is required").notEmpty().isEmail(),
    check("community", "Community is required").isMongoId(),
    check("planId", "Membership plan is required").isMongoId(),
    check("password", "Password must be at least 6 characters long")
      .isLength({ min: 6, max: 128 })
      .custom((value) => {
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Password cannot contain HTML or script tags");
        }
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    return createUserFromWallet(req, res);
  },
);

// @route GET api/users/referrals
// @desc Get users directly referred by the authenticated user
// @access Private (auth only — expired users can view)
router.get("/referrals", userAuth, getDirectReferrals);

// @route POST api/users/membership/renew
// @desc Create renewal payment order
// @access Private (auth only — expired users can renew)
router.post(
  "/membership/renew",
  [
    ...userAuth,
    check("planId", "Plan ID is required").isMongoId(),
  ],
  renewMembership,
);

// @route GET api/users/search-members
// @desc Search members with filters (for client side)
// @access Private
// CRITICAL: Must be defined BEFORE /profile route to prevent route matching conflict
router.get("/search-members", userProtected, searchMembers);

// @route GET api/users/member-details/:user_id
// @desc Get member details by ID (read-only, for viewing other users)
// @access Private
// CRITICAL: Must be defined BEFORE /:user_id route to prevent route matching conflict
router.get(
  "/member-details/:user_id",
  userProtected,
  getMemberDetailsById,
);

// @route GET api/users/profile
// @desc Get complete user profile (User + UserDetails)
// @access Private
// CRITICAL: Must be defined BEFORE /:user_id route to prevent route matching conflict
router.get("/profile", userProtected, getProfile);

// @route GET api/users/profile-requirements
// @desc Get profile & matrimonial field requirements (source of truth for client)
// @access Private
router.get(
  "/profile-requirements",
  userProtected,
  getProfileRequirements,
);

// @route PUT api/users/profile
// @desc Update user profile (User + UserDetails)
// @access Private
// CRITICAL: Member ID and Phone are immutable
// CRITICAL: Must be defined BEFORE /:user_id route to prevent route matching conflict
router.put(
  "/profile",
  [
    ...userProtected,
    [
      check("name")
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage("Name must be between 3 and 50 characters")
        .custom((value) => {
          if (value && /<[^>]*>/g.test(value)) {
            throw new Error("Name cannot contain HTML or script tags");
          }
          if (value && /\$[a-zA-Z]+/.test(value)) {
            throw new Error("Name contains invalid characters");
          }
          return true;
        }),
      check("email")
        .optional()
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
      check("alternatePhone")
        .optional()
        .isLength({ min: 10, max: 10 })
        .withMessage("Alternate phone must be exactly 10 digits")
        .matches(/^\d{10}$/)
        .withMessage("Alternate phone must contain only digits"),
      check("dob")
        .optional()
        .isISO8601()
        .withMessage("Date of birth must be a valid date"),
      check("gender")
        .optional()
        .isIn(["male", "female", "other"])
        .withMessage("Gender must be one of: male, female, other"),
      check("fatherName")
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage("Father's name must be between 3 and 100 characters")
        .trim(),
      check("motherName")
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage("Mother's name must be between 3 and 100 characters")
        .trim(),
      check("height")
        .optional()
        .isFloat({ min: 0, max: 300 })
        .withMessage("Height must be between 0 and 300"),
      check("weight")
        .optional()
        .isFloat({ min: 0, max: 500 })
        .withMessage("Weight must be between 0 and 500"),
      check("address")
        .optional()
        .isLength({ min: 5, max: 300 })
        .withMessage("Address must be between 5 and 300 characters")
        .trim(),
      check("maritalStatus")
        .optional()
        .isIn([
          "single",
          "married",
          "remarried",
          "divorced",
          "widowed",
          "separated",
        ])
        .withMessage(
          "Marital status must be one of: single, married, remarried, divorced, widowed, separated",
        ),
      check("education")
        .optional({ nullable: true })
        .custom((value) => {
          const result = validateEducationInput(value);
          if (!result.ok) {
            throw new Error(result.errors[0]?.msg || "Invalid education");
          }
          return true;
        }),
      check("occupation")
        .optional()
        .isLength({ max: 300 })
        .withMessage("Occupation must be at most 300 characters")
        .trim(),
      check("bloodGroup")
        .optional()
        .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
        .withMessage(
          "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-",
        ),
    ],
  ],
  updateProfile,
);

// @route PUT api/users/:user_id
// @desc Edit user Nickname by user_id
// @access Private
router.put(
  "/:user_id",
  [
    ...userProtected,
    [
      check("name", "Please provide the name")
        .not()
        .isEmpty()
        .withMessage("Name cannot be empty")
        .isLength({ min: 3, max: 20 })
        .withMessage("Name must be between 3 and 20 characters long")
        .custom((value) => {
          // Reject HTML/script tags
          if (/<[^>]*>/g.test(value)) {
            throw new Error("Name cannot contain HTML or script tags");
          }
          // Reject MongoDB operators
          if (/\$[a-zA-Z]+/.test(value)) {
            throw new Error("Name contains invalid characters");
          }
          return true;
        }),

      validateEmailField("email"),
      check("email").custom(async (value, { req }) => {
        const user_id = req.params.user_id;
        if (value) {
          const is_user_exists = await User.findOne({
            email: value,
            _id: { $ne: user_id },
          });
          if (is_user_exists) {
            throw new Error("Provided email is already registered.");
          }
        }
      }),

      validatePhoneField("phone"),

      check(
        "state",
        "State is required and should be at most 50 characters long",
      )
        .optional()
        .isString()
        .isLength({ max: 50 })
        .custom((value) => {
          if (value && /<[^>]*>/g.test(value)) {
            throw new Error("State cannot contain HTML or script tags");
          }
          return true;
        }),
    ],
  ],
  updateUserById,
);

// @route PUT api/users/:user_id/avatar
// @desc Update user avatar by user_id
// @access Private
router.put(
  "/:user_id/avatar",
  [
    ...userProtected,
    [
      check("avatar", "Please provide the avatar")
        .not()
        .isEmpty()
        .withMessage("Avatar cannot be empty")
        .isLength({ min: 3, max: 10 })
        .withMessage("Avatar must be between 3 and 10 characters long")
        .custom((value) => {
          // Reject HTML/script tags
          if (/<[^>]*>/g.test(value)) {
            throw new Error("Avatar cannot contain HTML or script tags");
          }
          // Reject MongoDB operators
          if (/\$[a-zA-Z]+/.test(value)) {
            throw new Error("Avatar contains invalid characters");
          }
          return true;
        }),
    ],
  ],
  updateAvatarByUserId,
);

module.exports = router;
