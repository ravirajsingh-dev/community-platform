const express = require("express");
const router = express.Router();
const { userProtected } = require("../../middleware/userProtected");
const {
  getVillages,
  createVillage,
} = require("./Controllers/LocationController");

router.get("/villages", ...userProtected, getVillages);
router.post("/villages", ...userProtected, createVillage);

module.exports = router;
