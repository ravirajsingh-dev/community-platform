const express = require("express");
const router = express.Router();
const { userProtected } = require("../../middleware/userProtected");
const {
  getCommunities,
  getVanshes,
  getKuls,
  getKhamps,
  getSubKhamps,
  getGotras,
  createCommunity,
  createVansh,
  createKul,
  createKhamp,
  createSubKhamp,
  createGotra,
} = require("./Controllers/MasterDataController");
const { getCreatableLevels } = require("./Controllers/MasterDataSettingsController");

router.get(
  "/creatable-levels",
  ...userProtected,
  getCreatableLevels,
);

router.get("/communities", ...userProtected, getCommunities);
router.post("/communities", ...userProtected, createCommunity);

router.get("/vanshes", ...userProtected, getVanshes);
router.post("/vanshes", ...userProtected, createVansh);

router.get("/kuls", ...userProtected, getKuls);
router.post("/kuls", ...userProtected, createKul);

router.get("/khamps", ...userProtected, getKhamps);
router.post("/khamps", ...userProtected, createKhamp);

router.get("/sub-khamps", ...userProtected, getSubKhamps);
router.post("/sub-khamps", ...userProtected, createSubKhamp);

router.get("/gotras", ...userProtected, getGotras);
router.post("/gotras", ...userProtected, createGotra);

module.exports = router;
