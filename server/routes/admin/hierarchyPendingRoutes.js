const express = require("express");
const { AdminAuth } = require("../../middleware/auth");
const { checkAnyHierarchyPermission } = require("../../middleware/checkAnyHierarchyPermission");
const {
  listPending,
  bulkApprovePending,
} = require("./Controllers/HierarchyPendingController");

const router = express.Router();

router.get(
  "/pending",
  [AdminAuth, checkAnyHierarchyPermission("edit")],
  listPending,
);

router.put(
  "/pending/bulk-approve",
  [AdminAuth, checkAnyHierarchyPermission("edit")],
  bulkApprovePending,
);

module.exports = router;
