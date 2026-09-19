const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");
const {
  resolveWalletMember,
  getWallets,
  getWalletTransactions,
  getAdminAdjustments,
  adjustWallet,
} = require("./Controllers/AdminWalletController");

router.get("/", [AdminAuth, checkPermission("wallets", "list")], getWallets);

router.get(
  "/resolve-member",
  [AdminAuth, checkPermission("wallets", "adjust")],
  resolveWalletMember,
);

router.get(
  "/admin-adjustments",
  [AdminAuth, checkPermission("wallets", "view")],
  getAdminAdjustments,
);

router.get(
  "/users/:userId/transactions",
  [AdminAuth, checkPermission("wallets", "view")],
  getWalletTransactions,
);

router.post(
  "/users/:userId/adjust",
  [
    AdminAuth,
    checkPermission("wallets", "adjust"),
    verifyTransactionPassword,
    check("type", "type is required").isIn(["credit", "debit"]),
    check("amount", "Amount must be a whole number from 1 to 99999").isInt({
      min: 1,
      max: 99999,
    }),
    check("remarks")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Remarks must be at most 500 characters"),
  ],
  adjustWallet,
);

module.exports = router;
