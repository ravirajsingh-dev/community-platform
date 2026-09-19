const express = require("express");
const router = express.Router();

const {
  getPublicCommonSettings,
  getPublicCommunities,
} = require("../admin/Controllers/CommonController");
const {
  getPublicSliderBanners,
} = require("../admin/Controllers/SliderController");
const {
  getPublicGalleryImages,
  getPublicGallerySettings,
} = require("../admin/Controllers/GalleryController");
const { getPublicVideos, getPublicVideoSettings } = require("../admin/Controllers/VideoController");
const {
  getPublicNews,
  getPublicNewsSettings,
} = require("../admin/Controllers/NewsController");
const {
  getPublicHowItWorksSettings,
} = require("../admin/Controllers/HowItWorksController");
const { getPublicLegalPage } = require("../admin/Controllers/LegalPageController");
const {
  getActiveDonationButtons,
  getDonationSettings,
  getTopDonations,
  generateDonationQRCode,
  submitDonationRequest,
} = require("../admin/Controllers/DonationController");
const { getActiveMembershipPlans } = require("../admin/Controllers/MembershipPlanController");
const { check } = require("express-validator");
const {
  validateEmailField,
  validatePhoneField,
  validateAmountField,
  validateUTRField,
  validateReferralIdField,
} = require("../../middleware/inputValidation");
const { OptionalUserAuth } = require("../../middleware/auth");

// @route GET /api/common/settings
// @desc Get public common settings
// @access Public
router.get("/settings", [], getPublicCommonSettings);

// @route GET /api/common/communities
// @desc Get active communities for registration dropdown
// @access Public
router.get("/communities", getPublicCommunities);

// @route GET /api/common/membership-plans
// @desc Get active membership plans for registration
// @access Public
router.get("/membership-plans", getActiveMembershipPlans);

// @route GET /api/common/slider-banners
// @desc Get active slider banners
// @access Public
router.get("/slider-banners", getPublicSliderBanners);

// @route GET /api/common/gallery/settings
// @desc Get gallery section settings
// @access Public
router.get("/gallery/settings", getPublicGallerySettings);

// @route GET /api/common/gallery
// @desc Get paginated gallery images
// @access Public
router.get("/gallery", getPublicGalleryImages);

// @route GET /api/common/videos/settings
// @desc Get video section settings
// @access Public
router.get("/videos/settings", getPublicVideoSettings);

// @route GET /api/common/videos
// @desc Get active videos
// @access Public
router.get("/videos", getPublicVideos);

// @route GET /api/common/news/settings
// @desc Get news section settings
// @access Public
router.get("/news/settings", getPublicNewsSettings);

// @route GET /api/common/news
// @desc Get active news items
// @access Public
router.get("/news", getPublicNews);

// @route GET /api/common/how-it-works/settings
// @desc Get How Our Platform Works section settings
// @access Public
router.get("/how-it-works/settings", getPublicHowItWorksSettings);

// @route GET /api/common/legal-pages/:slug
// @desc Get public legal/policy page by slug
// @access Public
router.get("/legal-pages/:slug", getPublicLegalPage);

// @route GET /api/common/donation/buttons
// @desc Get active donation buttons
// @access Public
router.get("/donation/buttons", getActiveDonationButtons);

// @route GET /api/common/donation/settings
// @desc Get donation settings
// @access Public
router.get("/donation/settings", getDonationSettings);

// @route GET /api/common/donation/top
// @desc Get top donations (sorted by amount, highest first)
// @access Public
router.get("/donation/top", getTopDonations);

// @route POST /api/common/donation/generate-qr
// @desc Generate UPI QR code for donation amount
// @access Public
router.post(
  "/donation/generate-qr",
  [
    validateAmountField("amount"),
  ],
  generateDonationQRCode
);

// @route POST /api/common/donation/request
// @desc Submit donation request
// @access Public
router.post(
  "/donation/request",
  OptionalUserAuth,
  [
    check("donorName", "Donor name is required")
      .trim()
      .notEmpty()
      .withMessage("Donor name cannot be empty")
      .isLength({ min: 2, max: 150 })
      .withMessage("Donor name must be between 2 and 150 characters")
      .custom((value) => {
        // Reject HTML/script tags
        if (/<[^>]*>/g.test(value)) {
          throw new Error("Donor name cannot contain HTML or script tags");
        }
        // Reject MongoDB operators
        if (/\$[a-zA-Z]+/.test(value)) {
          throw new Error("Donor name contains invalid characters");
        }
        return true;
      }),
    validatePhoneField("phone"),
    validateEmailField("email"),
    validateAmountField("amount"),
    validateUTRField("utrNumber"),
    validateReferralIdField("referralId"),
    check("paymentMode", "Payment mode is required")
      .isIn(["UPI", "BANK"])
      .withMessage("Payment mode must be either UPI or BANK"),
    check("address", "Address must be a string")
      .optional()
      .isString()
      .custom((value) => {
        if (value && /<[^>]*>/g.test(value)) {
          throw new Error("Address cannot contain HTML or script tags");
        }
        return true;
      }),
  ],
  submitDonationRequest
);

module.exports = router;
