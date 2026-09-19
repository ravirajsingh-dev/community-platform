const express = require("express");
const router = express.Router();
const { userProtected } = require("../../middleware/userProtected");
const {
  initFamily,
  getFamily,
  getFamilyFlat,
  getFamilyTree,
  createFamilyMember,
  updateFamilyMember,
  getMemberDeletionPreview,
  getEligibleSpouses,
  getEligibleChildren,
  deleteFamilyMember,
  createFamilyMarriage,
  updateFamilyMarriage,
  addChild,
  patchChildOrder,
} = require("./Controllers/FamilyController");

// @route POST api/users/family/init
// @desc Initialize family root (Root Male / Root Female)
// @access Private
router.post("/init", [...userProtected], initFamily);

// @route GET api/users/family
// @desc Get family container (ensures exists)
// @access Private
router.get("/", [...userProtected], getFamily);

// @route GET api/users/family/flat
// @desc Get flat members + marriages
// @access Private
router.get("/flat", [...userProtected], getFamilyFlat);

// @route GET api/users/family/tree
// @desc Get hierarchical spouse-aware tree
// @access Private
router.get("/tree", [...userProtected], getFamilyTree);

// @route POST api/users/family/members
// @desc Create a family member
// @access Private
router.post("/members", [...userProtected], createFamilyMember);

// @route PUT api/users/family/members/:memberId
// @desc Update a family member
// @access Private
router.put(
  "/members/:memberId",
  [...userProtected],
  updateFamilyMember,
);

// @route GET api/users/family/members/:memberId/deletion-preview
// @desc Get preview of what will be deleted (for confirmation modal)
// @access Private
router.get(
  "/members/:memberId/deletion-preview",
  [...userProtected],
  getMemberDeletionPreview,
);

// @route GET api/users/family/members/:memberId/eligible-spouses
// @desc Get member ids eligible to marry this member (opposite gender, no prohibited relationship)
// @access Private
router.get(
  "/members/:memberId/eligible-spouses",
  [...userProtected],
  getEligibleSpouses,
);

// @route DELETE api/users/family/members/:memberId
// @desc Delete member with complete subtree deletion (all descendants, marriages, spouses)
// @access Private
router.delete(
  "/members/:memberId",
  [...userProtected],
  deleteFamilyMember,
);

// @route POST api/users/family/marriages
// @desc Create a marriage between spouses
// @access Private
router.post("/marriages", [...userProtected], createFamilyMarriage);

// @route PATCH api/users/family/marriages/:marriageId
// @desc Update marriage status (e.g. divorced, widowed)
// @access Private
router.patch(
  "/marriages/:marriageId",
  [...userProtected],
  updateFamilyMarriage,
);

// @route GET api/users/family/marriages/:marriageId/eligible-children
// @desc Get member ids eligible to be added as child to this marriage
// @access Private
router.get(
  "/marriages/:marriageId/eligible-children",
  [...userProtected],
  getEligibleChildren,
);

// @route POST api/users/family/marriages/:marriageId/children
// @desc Add child to a marriage (child mapped to correct spouse)
// @access Private
router.post(
  "/marriages/:marriageId/children",
  [...userProtected],
  addChild,
);

// @route PATCH api/users/family/marriages/:marriageId/children/:childId
// @desc Update child order (manual birth order: 1 = eldest, 2 = second, ...)
// @access Private
router.patch(
  "/marriages/:marriageId/children/:childId",
  [...userProtected],
  patchChildOrder,
);

module.exports = router;
