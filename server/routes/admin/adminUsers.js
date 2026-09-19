const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const verifyTransactionPassword = require("../../middleware/verifyTransactionPassword");

const {
  getUsersList,
  getUserReferrals,
  getUserById,
  createUser,
  updateUserById,
  deleteUserById,
} = require("./Controllers/AdminUserController");

const {
  activateUserMembership,
  renewUserMembership,
  blockUserMembership,
  unblockUserMembership,
  expireUserMembership,
} = require("./Controllers/AdminUserMembershipController");

// @route GET api/admin/users/list
// @desc Get users list
// @access Private
router.get(
  "/list",
  [AdminAuth, checkPermission("users", "list")],
  getUsersList,
);

// @route GET api/admin/users/:user_id/referrals
// @desc Get users directly referred by a selected user
// @access Private
router.get(
  "/:user_id/referrals",
  [AdminAuth, checkPermission("users", "list")],
  getUserReferrals,
);

// @route POST api/admin/users
// @desc Create new user with core information (name, phone, email, password)
// @access Private
router.post("/", [AdminAuth, checkPermission("users", "create")], createUser);

// @route POST api/admin/users/:user_id/membership/activate
// @desc Activate membership with selected plan
// @access Private
router.post(
  "/:user_id/membership/activate",
  [
    AdminAuth,
    checkPermission("users", "edit"),
    verifyTransactionPassword,
    check("planId", "Plan ID is required").isMongoId(),
    check("remarks").optional().isString().isLength({ max: 500 }),
    check("amount").optional().isFloat({ min: 0 }),
  ],
  activateUserMembership,
);

// @route POST api/admin/users/:user_id/membership/renew
// @desc Renew membership with selected or current plan
// @access Private
router.post(
  "/:user_id/membership/renew",
  [
    AdminAuth,
    checkPermission("users", "edit"),
    verifyTransactionPassword,
    check("planId").optional().isMongoId(),
    check("remarks").optional().isString().isLength({ max: 500 }),
    check("amount").optional().isFloat({ min: 0 }),
  ],
  renewUserMembership,
);

// @route POST api/admin/users/:user_id/membership/block
// @desc Block user account
// @access Private
router.post(
  "/:user_id/membership/block",
  [
    AdminAuth,
    checkPermission("users", "edit"),
    verifyTransactionPassword,
    check("remarks").optional().isString().isLength({ max: 500 }),
  ],
  blockUserMembership,
);

// @route POST api/admin/users/:user_id/membership/unblock
// @desc Unblock user account
// @access Private
router.post(
  "/:user_id/membership/unblock",
  [
    AdminAuth,
    checkPermission("users", "edit"),
    verifyTransactionPassword,
    check("remarks").optional().isString().isLength({ max: 500 }),
  ],
  unblockUserMembership,
);

// @route POST api/admin/users/:user_id/membership/expire
// @desc Force-expire user membership
// @access Private
router.post(
  "/:user_id/membership/expire",
  [
    AdminAuth,
    checkPermission("users", "edit"),
    verifyTransactionPassword,
    check("remarks").optional().isString().isLength({ max: 500 }),
  ],
  expireUserMembership,
);

// @route GET api/admin/users/:user_id
// @desc Get user by user_id
// @access Private
router.get(
  "/:user_id",
  [AdminAuth, checkPermission("users", "list")],
  getUserById,
);

// @route PUT api/admin/users/:user_id
// @desc Update user profile by user_id
// @access Private
router.put(
  "/:user_id",
  [AdminAuth, checkPermission("users", "edit")],
  updateUserById,
);

// @route DELETE api/admin/users/:user_id
// @desc Delete user by user_id
// @access Private
router.delete(
  "/:user_id",
  [AdminAuth, checkPermission("users", "delete"), verifyTransactionPassword],
  deleteUserById,
);

module.exports = router;
