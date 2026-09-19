const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  getAdminPayments,
  getAdminPaymentById,
  getAdminPaymentStats,
  updatePaymentStatus,
  manualActivatePayment,
} = require("./Controllers/AdminPaymentController");

router.get(
  "/",
  [AdminAuth, checkPermission("payments", "list")],
  getAdminPayments,
);

router.get(
  "/stats",
  [AdminAuth, checkPermission("payments", "list")],
  getAdminPaymentStats,
);

router.post(
  "/manual-activate",
  [
    AdminAuth,
    checkPermission("payments", "edit"),
    verifyTransactionPassword,
    check("userId", "User ID is required").isMongoId(),
    check("planId", "Plan ID is required").isMongoId(),
    check("remarks").optional().isString().isLength({ max: 500 }),
    check("amount").optional().isFloat({ min: 0 }),
  ],
  manualActivatePayment,
);

router.get(
  "/:id",
  [AdminAuth, checkPermission("payments", "view")],
  getAdminPaymentById,
);

router.put(
  "/:id/status",
  [
    AdminAuth,
    checkPermission("payments", "edit"),
    verifyTransactionPassword,
    check("status", "Status is required").isIn(["success", "failed"]),
    check("remarks").optional().isString().isLength({ max: 500 }),
  ],
  updatePaymentStatus,
);

module.exports = router;
