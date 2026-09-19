const express = require("express");
const router = express.Router();
const { AdminAuth } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/permissions");
const {
  createVillage,
  getVillages,
  getVillageById,
  updateVillage,
  hardDeleteVillage,
  approveVillage,
  rejectVillage,
} = require("./Controllers/VillageController");

router.post("/", [AdminAuth, checkPermission("villages", "create")], createVillage);

router.get("/", [AdminAuth, checkPermission("villages", "list")], getVillages);

router.get("/:id", [AdminAuth, checkPermission("villages", "list")], getVillageById);

router.put("/:id", [AdminAuth, checkPermission("villages", "edit")], updateVillage);

router.delete("/:id/hard", [AdminAuth, checkPermission("villages", "delete")], hardDeleteVillage);

router.put("/:id/approve", [AdminAuth, checkPermission("villages", "edit")], approveVillage);

router.put("/:id/reject", [AdminAuth, checkPermission("villages", "edit")], rejectVillage);

module.exports = router;
