const express = require("express");
const router = express.Router();
const { userProtected } = require("../../middleware/userProtected");
const {
  apply,
  getMyProfile,
  updateMyProfile,
  activateMyProfile,
  deactivateMyProfile,
  deleteMyProfile,
  getList,
  getProfile,
} = require("./Controllers/MatrimonialController");

/**
 * POST /api/users/matrimonial/apply
 * Apply for Matrimonial (creates pending profile).
 * @access Private (User)
 */
router.post("/apply", ...userProtected, apply);

/**
 * GET /api/users/matrimonial/me
 * Get current user's matrimonial profile.
 * @access Private (User)
 */
router.get("/me", ...userProtected, getMyProfile);

/**
 * PUT /api/users/matrimonial/me
 * Update own matrimonial profile.
 * @access Private (User)
 */
router.put("/me", ...userProtected, updateMyProfile);

/**
 * PUT /api/users/matrimonial/me/activate
 * Activate own profile (visible in listings).
 * @access Private (User)
 */
router.put("/me/activate", ...userProtected, activateMyProfile);

/**
 * PUT /api/users/matrimonial/me/deactivate
 * Deactivate own profile (hidden from matches).
 * @access Private (User)
 */
router.put("/me/deactivate", ...userProtected, deactivateMyProfile);

/**
 * DELETE /api/users/matrimonial/me
 * Hard delete own matrimonial profile. Permanent.
 * @access Private (User)
 */
router.delete("/me", ...userProtected, deleteMyProfile);

/**
 * GET /api/users/matrimonial/list
 * List matrimonial profiles in the viewer's community only. Full filters. Works without applying.
 * @access Private (User)
 */
router.get("/list", ...userProtected, getList);

/**
 * GET /api/users/matrimonial/matches
 * Alias for list (viewer's community only).
 * @access Private (User)
 */
router.get("/matches", ...userProtected, getList);

/**
 * GET /api/users/matrimonial/profile/:id
 * Full profile view. Records who viewed.
 * @access Private (User)
 */
router.get("/profile/:id", ...userProtected, getProfile);

module.exports = router;
