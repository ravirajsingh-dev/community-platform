const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const response = require("../../../config/response");
const CommonSettings = require("../../../models/CommonSettings");
const { COMMON_SETTINGS_SINGLETON_KEY } = CommonSettings;
const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");
const Session = require("../../../models/Session");
const { comparePasswords } = require("../../../utils/helper");
const {
  validateUPI,
  validateAmount,
} = require("../../../utils/inputValidation");
const { uploadLogo, deleteLogo } = require("../../../helpers/logoService");
const {
  uploadAboutUsImage,
  deleteAboutUsImage,
} = require("../../../helpers/aboutUsImageService");
const {
  sanitizeSocialMediaLinks,
} = require("../../../utils/socialMediaHelpers");
const MembershipPlan = require("../../../models/MembershipPlan");
const {
  applyReferralSettingsUpdate,
} = require("../../../utils/referralCommissionHelpers");
const {
  sanitizeComingSoonMenuItems,
} = require("../../../utils/comingSoonHelpers");

const ABOUT_US_SECTION_FIELD = /^aboutUsSection_(.+)$/;
const MAX_ABOUT_US_SECTIONS = 30;

const normalizeAboutUs = (aboutUs = {}) => {
  const raw = aboutUs?.toObject ? aboutUs.toObject() : aboutUs || {};
  const title = raw.title || "";
  const intro = raw.intro || raw.description || "";

  let sections = Array.isArray(raw.sections)
    ? raw.sections.map((sec, index) => ({
        id: sec?.id || `sec_${index}`,
        heading: sec?.heading || "",
        description: sec?.description || "",
        imageUrl: sec?.imageUrl || "",
        imageKey: sec?.imageKey || "",
        order: typeof sec?.order === "number" ? sec.order : index,
      }))
    : [];

  if (
    sections.length === 0 &&
    (raw.mission || raw.vision || raw.description)
  ) {
    const legacy = [];
    if (raw.mission) {
      legacy.push({
        id: "legacy-mission",
        heading: "Our Mission",
        description: raw.mission,
        imageUrl: "",
        imageKey: "",
        order: 0,
      });
    }
    if (raw.vision) {
      legacy.push({
        id: "legacy-vision",
        heading: "Our Vision",
        description: raw.vision,
        imageUrl: "",
        imageKey: "",
        order: legacy.length,
      });
    }
    sections = legacy;
  }

  sections.sort((a, b) => a.order - b.order);
  return { title, intro, sections };
};

const applyAboutUsUpdate = async (settings, aboutUsPayload, uploadedFiles = []) => {
  const existing = normalizeAboutUs(settings.aboutUs);
  const incomingTitle =
    aboutUsPayload?.title !== undefined ? aboutUsPayload.title : existing.title;
  const incomingIntro =
    aboutUsPayload?.intro !== undefined
      ? aboutUsPayload.intro
      : aboutUsPayload?.description !== undefined
        ? aboutUsPayload.description
        : existing.intro;

  const incomingSections = Array.isArray(aboutUsPayload?.sections)
    ? aboutUsPayload.sections
    : existing.sections;

  if (incomingSections.length > MAX_ABOUT_US_SECTIONS) {
    throw new Error(
      `About Us supports at most ${MAX_ABOUT_US_SECTIONS} sections.`,
    );
  }

  const fileBySectionId = {};
  for (const file of uploadedFiles) {
    const match = file.fieldname?.match(ABOUT_US_SECTION_FIELD);
    if (match) fileBySectionId[match[1]] = file;
  }

  const oldById = Object.fromEntries(
    existing.sections.map((section) => [section.id, section]),
  );
  const newIds = new Set();
  const processedSections = [];

  for (let index = 0; index < incomingSections.length; index += 1) {
    const sec = incomingSections[index] || {};
    const id =
      (typeof sec.id === "string" && sec.id.trim()) ||
      `sec_${Date.now()}_${index}`;
    newIds.add(id);

    const prev = oldById[id] || {};
    let imageUrl = prev.imageUrl || "";
    let imageKey = prev.imageKey || "";

    if (sec.imageUrl !== undefined && sec.imageUrl !== "") {
      imageUrl = sec.imageUrl;
    }
    if (sec.imageKey !== undefined && sec.imageKey !== "") {
      imageKey = sec.imageKey;
    }

    if (fileBySectionId[id]) {
      const uploadResult = await uploadAboutUsImage(fileBySectionId[id]);
      if (imageKey) await deleteAboutUsImage(imageKey);
      imageUrl = uploadResult.url;
      imageKey = uploadResult.key;
    } else if (sec.clearImage === true || sec.clearImage === "true") {
      if (imageKey) await deleteAboutUsImage(imageKey);
      imageUrl = "";
      imageKey = "";
    }

    processedSections.push({
      id,
      heading: String(sec.heading || "").trim(),
      description: String(sec.description || "").trim(),
      imageUrl,
      imageKey,
      order: typeof sec.order === "number" ? sec.order : index,
    });
  }

  for (const oldSection of existing.sections) {
    if (!newIds.has(oldSection.id) && oldSection.imageKey) {
      await deleteAboutUsImage(oldSection.imageKey);
    }
  }

  settings.aboutUs = {
    title: String(incomingTitle || "").trim(),
    intro: String(incomingIntro || "").trim(),
    sections: processedSections,
  };
  settings.markModified("aboutUs");
};

/**
 * @route GET /api/admin/settings
 * @desc Get common settings (auto-creates if not found)
 * @access Private (Admin only)
 */
const getCommonSettings = async (req, res) => {
  try {
    // Get or create settings (ensures one document exists)
    const settings = await CommonSettings.getOrCreateSettings();

    return response.successResponse(
      res,
      settings,
      "Settings retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getCommonSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * @route PUT /api/admin/settings
 * @desc Update common settings
 * @access Private (Admin only)
 */
const updateCommonSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    // Validate transaction password
    const { txn_password } = req.body;
    if (!txn_password) {
      return response.errorResponse(
        res,
        { msg: "Transaction password is required." },
        "Transaction password is required.",
        400,
      );
    }

    // Get admin/subadmin and validate transaction password
    // Detect user role from auth token
    const adminID = req.user.id;
    const userRole = req.user.role;

    let admin;
    if (userRole === 2) {
      // Admin
      admin = await Admin.findById(adminID);
    } else if (userRole === 3) {
      // SubAdmin
      admin = await SubAdmin.findById(adminID);
    } else {
      // Fallback: try Admin first, then SubAdmin
      admin = await Admin.findById(adminID);
      if (!admin) {
        admin = await SubAdmin.findById(adminID);
      }
    }

    if (!admin) {
      return response.errorResponse(
        res,
        [{ msg: "Admin not found." }],
        "Admin not found.",
        400,
      );
    }

    // Check if admin has transaction password set
    if (!admin.txn_password) {
      return response.errorResponse(
        res,
        {
          msg: "Transaction password not set. Please set your transaction password first.",
        },
        "Transaction password not set.",
        400,
      );
    }

    // Validate transaction password
    const validPassword = await comparePasswords(
      txn_password,
      admin.txn_password,
    );
    if (!validPassword) {
      return response.errorResponse(
        res,
        [
          {
            path: "txn_password",
            msg: "Incorrect transaction password. Please double-check your credentials and try again.",
          },
        ],
        "Incorrect Transaction Password.",
        400,
      );
    }

    // Get or create settings first
    let settings = await CommonSettings.getOrCreateSettings();

    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    // Handle logo upload if provided
    const logoFile =
      req.file ||
      uploadedFiles.find((file) => file.fieldname === "logo") ||
      null;
    if (logoFile) {
      try {
        const uploadResult = await uploadLogo(logoFile);

        if (settings.logoKey) {
          await deleteLogo(settings.logoKey);
        }

        settings.logoUrl = uploadResult.url;
        settings.logoKey = uploadResult.key;
      } catch (error) {
        return response.errorResponse(
          res,
          [{ path: "logo", msg: error.message }],
          error.message,
          400,
        );
      }
    }

    // Extract allowed fields from request body
    // Handle both JSON and FormData (FormData sends nested objects as JSON strings)
    let {
      name,
      abbreviation,
      developedBy,
      developedByLink,
      socialMedia,
      donationEnabled,
      donationTitle,
      donationTitleHighlight,
      donationMessage,
      loginEnabled,
      registerEnabled,
      paymentGateway,
      referral,
      upi,
      bank,
      aboutUs,
      contactUsPage,
      comingSoon,
    } = req.body;

    // Parse nested objects if they are JSON strings (from FormData)
    if (typeof socialMedia === "string") {
      try {
        socialMedia = JSON.parse(socialMedia);
      } catch (e) {
        socialMedia = {};
      }
    }
    if (typeof upi === "string") {
      try {
        upi = JSON.parse(upi);
      } catch (e) {
        upi = {};
      }
    }
    if (typeof bank === "string") {
      try {
        bank = JSON.parse(bank);
      } catch (e) {
        bank = {};
      }
    }
    if (typeof aboutUs === "string") {
      try {
        aboutUs = JSON.parse(aboutUs);
      } catch (e) {
        aboutUs = {};
      }
    }
    if (typeof contactUsPage === "string") {
      try {
        contactUsPage = JSON.parse(contactUsPage);
      } catch (e) {
        contactUsPage = {};
      }
    }
    if (typeof comingSoon === "string") {
      try {
        comingSoon = JSON.parse(comingSoon);
      } catch (e) {
        comingSoon = {};
      }
    }
    if (typeof paymentGateway === "string") {
      try {
        paymentGateway = JSON.parse(paymentGateway);
      } catch (e) {
        paymentGateway = {};
      }
    }
    if (typeof referral === "string") {
      try {
        referral = JSON.parse(referral);
      } catch (e) {
        referral = {};
      }
    }

    // Helper function to parse boolean from string (FormData sends booleans as strings)
    const parseBoolean = (value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value === "true" || value === "on";
      }
      return Boolean(value);
    };

    // Update general information - REQUIRED FIELDS: never overwrite with empty/null
    // Only assign when we have a valid non-empty trimmed value
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (trimmedName) settings.name = trimmedName;

    if (abbreviation !== undefined)
      settings.abbreviation = String(abbreviation).trim();
    if (developedBy !== undefined)
      settings.developedBy = String(developedBy).trim();
    if (developedByLink !== undefined) {
      const trimmedLink = String(developedByLink).trim();
      if (!trimmedLink) {
        settings.developedByLink = "";
      } else {
        const normalizedLink = /^https?:\/\//i.test(trimmedLink)
          ? trimmedLink
          : `https://${trimmedLink}`;
        try {
          const parsedUrl = new URL(normalizedLink);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return response.errorResponse(
              res,
              [{ path: "developedByLink", msg: "Please provide a valid portfolio URL." }],
              "Validation Error",
              400,
            );
          }
          settings.developedByLink = normalizedLink;
        } catch {
          return response.errorResponse(
            res,
            [{ path: "developedByLink", msg: "Please provide a valid portfolio URL." }],
            "Validation Error",
            400,
          );
        }
      }
    }

    // Update donation settings
    if (donationEnabled !== undefined) {
      settings.donationEnabled = parseBoolean(donationEnabled);
    }
    if (donationTitle !== undefined) {
      settings.donationTitle = String(donationTitle).trim();
    }
    if (donationTitleHighlight !== undefined) {
      settings.donationTitleHighlight = String(donationTitleHighlight).trim();
    }
    if (donationMessage !== undefined) {
      settings.donationMessage = String(donationMessage).trim();
    }

    // Update authentication settings
    // Check if login or register is being disabled
    const wasLoginEnabled = settings.loginEnabled;
    const wasRegisterEnabled = settings.registerEnabled;

    if (loginEnabled !== undefined) {
      settings.loginEnabled = parseBoolean(loginEnabled);
    }
    if (registerEnabled !== undefined) {
      settings.registerEnabled = parseBoolean(registerEnabled);
    }

    // Update payment gateway settings
    if (paymentGateway) {
      if (!settings.paymentGateway) {
        settings.paymentGateway = {
          enabled: false,
          provider: "cashfree",
        };
      }
      if (paymentGateway.enabled !== undefined) {
        settings.paymentGateway.enabled = parseBoolean(paymentGateway.enabled);
      }
      if (paymentGateway.provider !== undefined) {
        const provider = String(paymentGateway.provider).trim().toLowerCase();
        if (provider) {
          settings.paymentGateway.provider = provider;
        }
      }
      settings.markModified("paymentGateway");
    }

    // Update referral commission settings (per-plan + donation targets)
    if (referral) {
      const referralResult = await applyReferralSettingsUpdate({
        settings,
        referral,
        parseBoolean,
        MembershipPlan,
      });
      if (!referralResult.ok) {
        return response.errorResponse(
          res,
          referralResult.errors,
          "Validation Error",
          400,
        );
      }
    }

    // If login or register is being disabled, logout all users (but not admins)
    // Session role: 1 = User, 2 = Admin
    if (
      (loginEnabled === false && wasLoginEnabled === true) ||
      (registerEnabled === false && wasRegisterEnabled === true)
    ) {
      try {
        // Delete all sessions for regular users only (role = 1)
        await Session.deleteMany({ role: 1 });
      } catch (err) {
        console.error("Error logging out all users:", err);
        // Don't fail the request if logout fails, just log the error
      }
    }

    // Update UPI details (all optional; empty values allowed)
    if (upi) {
      if (upi.upiId !== undefined) {
        const trimmed = String(upi.upiId).trim();
        if (trimmed === "") {
          settings.upi.upiId = "";
        } else {
          const upiValidation = validateUPI(upi.upiId);
          if (!upiValidation.valid) {
            return response.errorResponse(
              res,
              [{ path: "upi.upiId", msg: upiValidation.error }],
              upiValidation.error,
              400,
            );
          }
          settings.upi.upiId = upiValidation.sanitized;
        }
      }
      if (upi.upiHolderName !== undefined) {
        // Sanitize UPI holder name
        let sanitizedName = String(upi.upiHolderName).trim();
        sanitizedName = sanitizedName.replace(/<[^>]*>/g, "");
        sanitizedName = sanitizedName.replace(/\$[a-zA-Z]+/g, "");
        settings.upi.upiHolderName = sanitizedName;
      }
    }

    // Update bank details
    if (bank) {
      if (bank.bankName !== undefined) settings.bank.bankName = bank.bankName;
      if (bank.accountNo !== undefined)
        settings.bank.accountNo = bank.accountNo;
      if (bank.accountHolderName !== undefined)
        settings.bank.accountHolderName = bank.accountHolderName;
      if (bank.ifscCode !== undefined) settings.bank.ifscCode = bank.ifscCode;
    }

    // Update social media links
    if (socialMedia && Array.isArray(socialMedia.links)) {
      if (!settings.socialMedia) {
        settings.socialMedia = { links: [] };
      }
      settings.socialMedia.links = sanitizeSocialMediaLinks(socialMedia.links);
      settings.markModified("socialMedia");
    }

    // Update About Us page content
    if (aboutUs) {
      try {
        await applyAboutUsUpdate(settings, aboutUs, uploadedFiles);
      } catch (aboutUsError) {
        return response.errorResponse(
          res,
          [{ path: "aboutUs", msg: aboutUsError.message }],
          aboutUsError.message,
          400,
        );
      }
    }

    // Update Contact Us page content
    if (contactUsPage) {
      if (!settings.contactUsPage) {
        settings.contactUsPage = {
          title: "",
          intro: "",
          phone: "",
          secondaryPhone: "",
          email: "",
          address: "",
          businessHours: "",
        };
      }
      if (contactUsPage.title !== undefined)
        settings.contactUsPage.title = contactUsPage.title;
      if (contactUsPage.intro !== undefined)
        settings.contactUsPage.intro = contactUsPage.intro;
      if (contactUsPage.phone !== undefined)
        settings.contactUsPage.phone = contactUsPage.phone;
      if (contactUsPage.secondaryPhone !== undefined)
        settings.contactUsPage.secondaryPhone = contactUsPage.secondaryPhone;
      if (contactUsPage.email !== undefined)
        settings.contactUsPage.email = String(contactUsPage.email)
          .trim()
          .toLowerCase();
      if (contactUsPage.address !== undefined)
        settings.contactUsPage.address = contactUsPage.address;
      if (contactUsPage.businessHours !== undefined)
        settings.contactUsPage.businessHours = contactUsPage.businessHours;
    }

    // Update Coming Soon page content + sidebar menu items
    if (comingSoon !== undefined) {
      if (!settings.comingSoon) {
        settings.comingSoon = {
          enabled: true,
          title: "Coming Soon",
          description:
            "This feature is under development and will be available soon.",
          menuItems: [],
          initiatives: [],
        };
      }
      if (comingSoon.enabled !== undefined) {
        settings.comingSoon.enabled = parseBoolean(comingSoon.enabled);
      }
      if (comingSoon.title !== undefined) {
        settings.comingSoon.title = String(comingSoon.title || "").trim();
      }
      if (comingSoon.description !== undefined) {
        settings.comingSoon.description = String(
          comingSoon.description || "",
        ).trim();
      }
      if (comingSoon.menuItems !== undefined) {
        settings.comingSoon.menuItems = sanitizeComingSoonMenuItems(
          Array.isArray(comingSoon.menuItems) ? comingSoon.menuItems : [],
        );
      }
      if (
        comingSoon.initiatives !== undefined &&
        Array.isArray(comingSoon.initiatives)
      ) {
        settings.comingSoon.initiatives = comingSoon.initiatives
          .filter(
            (init) =>
              init &&
              init.title &&
              typeof init.title === "string" &&
              init.title.trim().length > 0,
          )
          .map((init, index) => ({
            title: String(init.title).trim(),
            description: init.description
              ? String(init.description).trim()
              : "",
            order: typeof init.order === "number" ? init.order : index,
          }));
      }
      settings.markModified("comingSoon");
    }

    // Save updated settings
    if (!settings.singletonKey) {
      await CommonSettings.updateOne(
        { _id: settings._id },
        { $set: { singletonKey: COMMON_SETTINGS_SINGLETON_KEY } },
      );
      settings.singletonKey = COMMON_SETTINGS_SINGLETON_KEY;
    }
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Settings updated successfully.",
    );
  } catch (err) {
    console.error("Error in updateCommonSettings:", err);

    // Handle Mongoose validation errors with structured response
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }

    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "true" || value === "on";
  }
  return Boolean(value);
};

/**
 * @route PUT /api/admin/membership-settings
 * @desc Update membership-related settings (auth, payment gateway, referral)
 * @access Private (membership-plans settings)
 */
const updateMembershipSettings = async (req, res) => {
  try {
    let { loginEnabled, registerEnabled, paymentGateway, referral } = req.body;

    if (typeof paymentGateway === "string") {
      try {
        paymentGateway = JSON.parse(paymentGateway);
      } catch (e) {
        paymentGateway = {};
      }
    }
    if (typeof referral === "string") {
      try {
        referral = JSON.parse(referral);
      } catch (e) {
        referral = {};
      }
    }

    let settings = await CommonSettings.getOrCreateSettings();
    const wasLoginEnabled = settings.loginEnabled;
    const wasRegisterEnabled = settings.registerEnabled;

    if (loginEnabled !== undefined) {
      settings.loginEnabled = parseBoolean(loginEnabled);
    }
    if (registerEnabled !== undefined) {
      settings.registerEnabled = parseBoolean(registerEnabled);
    }

    if (paymentGateway) {
      if (!settings.paymentGateway) {
        settings.paymentGateway = {
          enabled: false,
          provider: "cashfree",
        };
      }
      if (paymentGateway.enabled !== undefined) {
        settings.paymentGateway.enabled = parseBoolean(paymentGateway.enabled);
      }
      if (paymentGateway.provider !== undefined) {
        const provider = String(paymentGateway.provider).trim().toLowerCase();
        if (provider) {
          settings.paymentGateway.provider = provider;
        }
      }
      settings.markModified("paymentGateway");
    }

    if (referral) {
      const referralResult = await applyReferralSettingsUpdate({
        settings,
        referral,
        parseBoolean,
        MembershipPlan,
      });
      if (!referralResult.ok) {
        return response.errorResponse(
          res,
          referralResult.errors,
          "Validation Error",
          400,
        );
      }
    }

    if (
      (loginEnabled === false && wasLoginEnabled === true) ||
      (registerEnabled === false && wasRegisterEnabled === true)
    ) {
      try {
        await Session.deleteMany({ role: 1 });
      } catch (err) {
        console.error("Error logging out all users:", err);
      }
    }

    if (!settings.singletonKey) {
      await CommonSettings.updateOne(
        { _id: settings._id },
        { $set: { singletonKey: COMMON_SETTINGS_SINGLETON_KEY } },
      );
      settings.singletonKey = COMMON_SETTINGS_SINGLETON_KEY;
    }
    await settings.save();

    return response.successResponse(
      res,
      settings,
      "Membership settings updated successfully.",
    );
  } catch (err) {
    console.error("Error in updateMembershipSettings:", err);
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors,
      });
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getCommonSettings,
  updateCommonSettings,
  updateMembershipSettings,
};
