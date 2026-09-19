const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const { DURATION_TYPES } = require("../../models/MembershipPlan");

const {
  getMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
} = require("./Controllers/MembershipPlanController");

const planValidationRules = [
  check("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Plan name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Plan name must be at most 100 characters"),
  check("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a number greater than or equal to 0"),
  check("currency")
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter code"),
  check("durationType")
    .optional()
    .isIn(DURATION_TYPES)
    .withMessage(`durationType must be one of: ${DURATION_TYPES.join(", ")}`),
  check("durationValue")
    .optional()
    .isInt({ min: 1 })
    .withMessage("durationValue must be at least 1"),
];

const createPlanValidationRules = [
  check("name", "Plan name is required")
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage("Plan name must be at most 100 characters"),
  check("price", "Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a number greater than or equal to 0"),
  check("durationType", "durationType is required")
    .isIn(DURATION_TYPES)
    .withMessage(`durationType must be one of: ${DURATION_TYPES.join(", ")}`),
  ...planValidationRules,
];

router.get(
  "/",
  [AdminAuth, checkPermission("membership-plans", "list")],
  getMembershipPlans,
);

router.post(
  "/",
  [AdminAuth, checkPermission("membership-plans", "create"), ...createPlanValidationRules],
  createMembershipPlan,
);

router.get(
  "/:id",
  [AdminAuth, checkPermission("membership-plans", "list")],
  getMembershipPlanById,
);

router.put(
  "/:id",
  [
    AdminAuth,
    checkPermission("membership-plans", "edit"),
    verifyTransactionPassword,
    ...planValidationRules,
  ],
  updateMembershipPlan,
);

router.delete(
  "/:id",
  [
    AdminAuth,
    checkPermission("membership-plans", "delete"),
    verifyTransactionPassword,
  ],
  deleteMembershipPlan,
);

module.exports = router;
