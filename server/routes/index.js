const express = require("express");
const router = express.Router();

// ============================================
// ADMIN ROUTES
// ============================================
router.use("/api/auth/admin", require("./admin/auth/authAdmin"));
router.use("/api/admin/users", require("./admin/adminUsers"));
router.use("/api/admin/family", require("./admin/familyRoutes"));
router.use("/api/admin", require("./admin/adminSettingsRoutes"));
router.use("/api/admin", require("./admin/adminProfileRoutes"));
router.use("/api/admin", require("./admin/legalPageRoutes"));
router.use("/api/admin/slider", require("./admin/slider"));
router.use("/api/admin/gallery", require("./admin/gallery"));
router.use("/api/admin/video", require("./admin/video"));
router.use("/api/admin/news", require("./admin/news"));
router.use("/api/admin/how-it-works", require("./admin/howItWorks"));
router.use("/api/admin/donation", require("./admin/donationRoutes"));
router.use("/api/admin/sub-admins", require("./admin/subAdminRoutes"));
router.use("/api/admin/communities", require("./admin/communityRoutes"));
router.use("/api/admin/villages", require("./admin/villageRoutes"));
router.use("/api/admin/vansh", require("./admin/vanshRoutes"));
router.use("/api/admin/kul", require("./admin/kulRoutes"));
router.use("/api/admin/khamp", require("./admin/khampRoutes"));
router.use("/api/admin/sub-khamp", require("./admin/subKhampRoutes"));
router.use("/api/admin/gotra", require("./admin/gotraRoutes"));
router.use("/api/admin/hierarchy", require("./admin/hierarchyPendingRoutes"));
router.use("/api/admin/matrimonial", require("./admin/matrimonialRoutes"));
router.use("/api/admin/membership-plans", require("./admin/membershipPlanRoutes"));
router.use("/api/admin/payments", require("./admin/paymentRoutes"));
router.use("/api/admin/wallets", require("./admin/walletRoutes"));

// ============================================
// SUB-ADMIN ROUTES
// ============================================
// (No sub-admin routes currently)

// ============================================
// USER ROUTES
// ============================================
router.use("/api/auth/users", require("./user/auth/register"));
router.use("/api/auth", require("./user/auth/authUser"));
router.use("/api/users", require("./user/users"));
router.use("/api/users", require("./user/userDetails"));
router.use("/api/users/family", require("./user/familyRoutes"));
router.use("/api/users/master-data", require("./user/masterDataRoutes"));
router.use("/api/users/location", require("./user/locationRoutes"));
router.use("/api/users/matrimonial", require("./user/matrimonialRoutes"));

// ============================================
// COMMON ROUTES
// ============================================
router.use("/api/common", require("./common/commonRoutes"));

// ============================================
// PAYMENT ROUTES
// ============================================
router.use("/api/payments", require("./payments/paymentRoutes"));

module.exports = router;
