const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const DonationButton = require("../../../models/DonationButton");
const DonationRequest = require("../../../models/DonationRequest");
const CommonSettings = require("../../../models/CommonSettings");
const User = require("../../../models/User");
const response = require("../../../config/response");
const { generateQRCodeWithAmount } = require("../../../utils/qrCodeUtils");
const { logSecurityEvent, EVENT_TYPES } = require("../../../utils/auditLogger");
const {
  sanitizeDuplicateKeyError,
  sanitizeValidationErrors,
} = require("../../../utils/errorSanitizer");
const { validateUPI, toTitleCase } = require("../../../utils/inputValidation");
const emailService = require("../../../services/email");
const {
  creditDonationReferralCommissionIfEligible,
} = require("../../../services/referralCommissionService");
const {
  resolveDonationReferralCandidate,
  validateDonationReferrerAtSubmit,
} = require("../../../utils/donationReferralHelpers");

/**
 * @route GET /api/common/donation/top
 * @desc Get top donations (sorted by amount, highest first)
 * @access Public
 */
const getTopDonations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20; // Default to 20, can be overridden

    // Validate limit
    if (limit < 1 || limit > 1000) {
      return response.errorResponse(
        res,
        [{ msg: "Limit must be between 1 and 1000" }],
        "Invalid limit",
        400,
      );
    }

    const topDonations = await DonationRequest.find({ status: "approved" })
      .sort({ amount: -1 })
      .limit(limit)
      .select("donorName amount createdAt")
      .lean();

    const transformedDonations = topDonations.map((donation) => ({
      _id: donation._id,
      donorName: donation.donorName || "Guest User",
      amount: donation.amount,
      createdAt: donation.createdAt,
    }));

    return response.successResponse(
      res,
      {
        donations: transformedDonations,
        limit,
        total: transformedDonations.length,
      },
      "Top donations retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching top donations:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/common/donation/buttons
 * @desc Get active donation buttons
 * @access Public
 */
const getActiveDonationButtons = async (req, res) => {
  try {
    const buttons = await DonationButton.find({ isActive: true })
      .sort({ amount: 1 })
      .lean();

    return response.successResponse(
      res,
      buttons,
      "Donation buttons retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation buttons:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const buildDonationSettingsResponse = (settings) => ({
  donationEnabled: settings.donationEnabled || false,
  donationTitle: settings.donationTitle || "",
  donationTitleHighlight: settings.donationTitleHighlight || "",
  donationMessage: settings.donationMessage || "",
  topDonationsEnabled:
    settings.topDonationsEnabled !== undefined
      ? settings.topDonationsEnabled
      : true,
  topDonationsLimit: settings.topDonationsLimit || 20,
  upi: {
    upiId: settings.upi?.upiId || "",
    upiHolderName: settings.upi?.upiHolderName || "",
  },
  bank: {
    bankName: settings.bank?.bankName || "",
    accountNo: settings.bank?.accountNo || "",
    accountHolderName: settings.bank?.accountHolderName || "",
    ifscCode: settings.bank?.ifscCode || "",
  },
});

/**
 * @route GET /api/common/donation/settings
 * @desc Get donation section visibility settings
 * @access Public
 */
const getDonationSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();

    return response.successResponse(
      res,
      buildDonationSettingsResponse(settings),
      "Donation settings retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation settings:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route POST /api/common/donation/generate-qr
 * @desc Generate QR code for donation amount
 * @access Public
 */
const generateDonationQRCode = async (req, res) => {
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

    const { amount } = req.body;

    const settings = await CommonSettings.getOrCreateSettings();

    if (!settings.upi?.upiId || !settings.upi?.upiHolderName) {
      return response.errorResponse(
        res,
        { msg: "Service configuration error" },
        "Service configuration error",
        400,
      );
    }

    const qrData = await generateQRCodeWithAmount(
      settings.upi.upiId,
      settings.upi.upiHolderName,
      amount,
    );

    // Log QR code generation
    logSecurityEvent({
      eventType: EVENT_TYPES.QR_CODE_GENERATED,
      status: "success",
      req,
      details: { amount: qrData.amount, transactionRef: qrData.transactionRef },
    });

    return response.successResponse(
      res,
      {
        qrCodeData: qrData.qrCodeData,
        amount: qrData.amount,
      },
      "QR code generated successfully",
    );
  } catch (err) {
    console.error("Error generating QR code:", err);
    return response.errorResponse(
      res,
      { msg: "An error occurred" },
      "An error occurred",
      500,
    );
  }
};

/**
 * @route POST /api/common/donation/request
 * @desc Submit donation request (UPI or bank transfer)
 * @access Public
 */
const submitDonationRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    const {
      donorName,
      phone,
      email,
      address,
      amount,
      utrNumber,
      paymentMode,
    } = req.body;
    const phoneStr = String(phone).trim();
    const requestedReferralId = resolveDonationReferralCandidate(
      req.body,
      req.userObj?.referralId,
    );

    let resolvedReferralId;
    if (requestedReferralId) {
      const referrer = await User.findOne({
        memberId: requestedReferralId,
      }).select("memberId phone status");

      const validation = validateDonationReferrerAtSubmit({
        referralCandidate: requestedReferralId,
        referrer,
        donorPhone: phoneStr,
      });

      if (!validation.ok) {
        return response.errorResponse(
          res,
          [
            {
              path: "referralId",
              msg: validation.error,
            },
          ],
          "Validation Error",
          400,
        );
      }

      resolvedReferralId = validation.referralId;
    }

    // Check if UTR number already exists
    const existingRequest = await DonationRequest.findOne({ utrNumber });
    if (existingRequest) {
      return response.errorResponse(
        res,
        [{ path: "utrNumber", msg: "This UTR / transaction reference is already submitted" }],
        "Duplicate field error",
        400,
      );
    }

    const donationRequest = new DonationRequest({
      donorName: toTitleCase(String(donorName)),
      phone: phoneStr,
      email,
      address: address || "",
      amount,
      utrNumber,
      paymentMode,
      status: "pending",
      ...(resolvedReferralId ? { referralId: resolvedReferralId } : {}),
      ...(req.userObj?._id ? { userId: req.userObj._id } : {}),
    });

    await donationRequest.save();

    // Log payment verification request
    logSecurityEvent({
      eventType: EVENT_TYPES.PAYMENT_VERIFICATION,
      status: "success",
      req,
      details: {
        donationRequestId: donationRequest._id.toString(),
        amount,
        paymentMode,
        utrNumber: utrNumber ? "provided" : "not_provided", // Don't log full UTR for security
      },
    });

    return response.successResponse(
      res,
      { id: donationRequest._id },
      "Your donation request has been submitted for admin approval",
      201,
    );
  } catch (err) {
    console.error("Error submitting donation request:", err);
    if (err.code === 11000) {
      // Duplicate key error (UTR number)
      const sanitizedError = sanitizeDuplicateKeyError(err, "utrNumber");
      return response.errorResponse(
        res,
        [sanitizedError],
        "Duplicate field error",
        400,
      );
    }
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/admin/donation/settings
 * @desc Get donation settings (admin)
 * @access Private (Admin)
 */
const getAdminDonationSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();

    return response.successResponse(
      res,
      buildDonationSettingsResponse(settings),
      "Donation settings retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching admin donation settings:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route PUT /api/admin/donation/settings
 * @desc Update donation settings (admin)
 * @access Private (Admin)
 */
const updateAdminDonationSettings = async (req, res) => {
  try {
    let {
      donationEnabled,
      donationTitle,
      donationTitleHighlight,
      donationMessage,
      topDonationsEnabled,
      topDonationsLimit,
      upi,
      bank,
    } = req.body;

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

    const parseBoolean = (value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value === "true" || value === "on";
      }
      return Boolean(value);
    };

    const settings = await CommonSettings.getOrCreateSettings();

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
    if (topDonationsEnabled !== undefined) {
      settings.topDonationsEnabled = parseBoolean(topDonationsEnabled);
    }
    if (topDonationsLimit !== undefined) {
      const limit = parseInt(topDonationsLimit, 10);
      if (Number.isNaN(limit) || limit < 1 || limit > 100) {
        return response.errorResponse(
          res,
          [{ path: "topDonationsLimit", msg: "Limit must be between 1 and 100" }],
          "Limit must be between 1 and 100",
          400,
        );
      }
      settings.topDonationsLimit = limit;
    }

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
        let sanitizedName = String(upi.upiHolderName).trim();
        sanitizedName = sanitizedName.replace(/<[^>]*>/g, "");
        sanitizedName = sanitizedName.replace(/\$[a-zA-Z]+/g, "");
        settings.upi.upiHolderName = sanitizedName;
      }
    }

    if (bank) {
      if (bank.bankName !== undefined) settings.bank.bankName = bank.bankName;
      if (bank.accountNo !== undefined) settings.bank.accountNo = bank.accountNo;
      if (bank.accountHolderName !== undefined) {
        settings.bank.accountHolderName = bank.accountHolderName;
      }
      if (bank.ifscCode !== undefined) settings.bank.ifscCode = bank.ifscCode;
    }

    await settings.save();

    return response.successResponse(
      res,
      buildDonationSettingsResponse(settings),
      "Donation settings updated successfully",
    );
  } catch (err) {
    console.error("Error updating admin donation settings:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/admin/donation/buttons
 * @desc Get all donation buttons (admin)
 * @access Private (Admin)
 */
const getAllDonationButtons = async (req, res) => {
  try {
    const buttons = await DonationButton.find().sort({ amount: 1 }).lean();

    return response.successResponse(
      res,
      buttons,
      "Donation buttons retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation buttons:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route POST /api/admin/donation/buttons
 * @desc Create donation button (admin)
 * @access Private (Admin)
 */
const createDonationButton = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    const { amount, type, buttonText, isActive } = req.body;
    const buttonType = type || "FIXED";

    // If type is ANY, check if one already exists
    if (buttonType === "ANY") {
      const existingAnyButton = await DonationButton.findOne({ type: "ANY" });
      if (existingAnyButton) {
        return response.errorResponse(
          res,
          [
            {
              path: "type",
              msg: "Only one 'ANY' type donation button is allowed",
            },
          ],
          "Only one 'ANY' type donation button is allowed",
          400,
        );
      }
    }

    const donationButton = new DonationButton({
      amount: buttonType === "ANY" ? 0 : amount,
      type: buttonType,
      buttonText:
        buttonType === "ANY"
          ? buttonText || "Donate Any Other Amount"
          : buttonText || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    await donationButton.save();

    return response.successResponse(
      res,
      donationButton,
      "Donation button created successfully",
      201,
    );
  } catch (err) {
    console.error("Error creating donation button:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route PUT /api/admin/donation/buttons/:id
 * @desc Update donation button (admin)
 * @access Private (Admin)
 */
const updateDonationButton = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    const { id } = req.params;
    const { amount, type, buttonText, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    const donationButton = await DonationButton.findById(id);
    if (!donationButton) {
      return response.errorResponse(res, {}, "Resource not found", 404);
    }

    // If changing to ANY type, check if another ANY button exists
    if (type !== undefined && type === "ANY" && donationButton.type !== "ANY") {
      const existingAnyButton = await DonationButton.findOne({
        type: "ANY",
        _id: { $ne: id },
      });
      if (existingAnyButton) {
        return response.errorResponse(
          res,
          [
            {
              path: "type",
              msg: "Only one 'ANY' type donation button is allowed",
            },
          ],
          "Only one 'ANY' type donation button is allowed",
          400,
        );
      }
    }

    if (type !== undefined) donationButton.type = type;
    const buttonType = type !== undefined ? type : donationButton.type;

    if (buttonType === "FIXED") {
      if (amount !== undefined) donationButton.amount = amount;
      if (buttonText !== undefined)
        donationButton.buttonText = buttonText || null;
    } else {
      // For ANY type, set amount to 0
      donationButton.amount = 0;
      if (buttonText !== undefined)
        donationButton.buttonText = buttonText || "Donate Any Other Amount";
    }

    if (isActive !== undefined) donationButton.isActive = isActive;

    await donationButton.save();

    return response.successResponse(
      res,
      donationButton,
      "Donation button updated successfully",
    );
  } catch (err) {
    console.error("Error updating donation button:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route DELETE /api/admin/donation/buttons/:id
 * @desc Delete donation button (admin)
 * @access Private (Admin)
 */
const deleteDonationButton = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    const donationButton = await DonationButton.findById(id);
    if (!donationButton) {
      return response.errorResponse(res, {}, "Resource not found", 404);
    }

    await DonationButton.findByIdAndDelete(id);

    return response.successResponse(
      res,
      {},
      "Donation button deleted successfully",
    );
  } catch (err) {
    console.error("Error deleting donation button:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/admin/donation/requests
 * @desc Get all donation requests with filters (admin)
 * @access Private (Admin)
 */
const getAllDonationRequests = async (req, res) => {
  try {
    const {
      status,
      fromDate,
      toDate,
      phone,
      email,
      amount,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (phone) {
      query.phone = { $regex: phone, $options: "i" };
    }

    if (email) {
      query.email = { $regex: email, $options: "i" };
    }

    if (amount) {
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum)) {
        query.amount = amountNum;
      }
    }

    if (search) {
      query.$or = [
        { utrNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { donorName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDateEnd;
      }
    }

    const [donations, totalDonations] = await Promise.all([
      DonationRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DonationRequest.countDocuments(query),
    ]);

    const data = donations.map((request) => ({
      _id: request._id,
      donorName: request.donorName,
      phone: request.phone,
      email: request.email,
      address: request.address || "",
      amount: request.amount,
      paymentMode: request.paymentMode,
      utrNumber: request.utrNumber,
      status: request.status,
      rejectionReason: request.rejectionReason || "",
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }));

    return response.successResponse(
      res,
      {
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalDonations,
          pages: Math.ceil(totalDonations / limitNum),
        },
      },
      "Donation requests retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation requests:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route GET /api/admin/donation/requests/:id
 * @desc Get single donation request (admin)
 * @access Private (Admin)
 */
const getDonationRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    const donationRequest = await DonationRequest.findById(id).lean();

    if (!donationRequest) {
      return response.errorResponse(res, {}, "Resource not found", 404);
    }

    return response.successResponse(
      res,
      donationRequest,
      "Donation request retrieved successfully",
    );
  } catch (err) {
    console.error("Error fetching donation request:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * @route PUT /api/admin/donation/requests/:id/approve
 * @desc Approve donation request (admin)
 * @access Private (Admin)
 */
const approveDonationRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    let donationRequest = null;

    await session.withTransaction(async () => {
      donationRequest = await DonationRequest.findOneAndUpdate(
        { _id: id, status: "pending" },
        { $set: { status: "approved", rejectionReason: "" } },
        { returnDocument: "after", session },
      );

      if (!donationRequest) {
        return;
      }

      await creditDonationReferralCommissionIfEligible({
        donationRequest,
        session,
      });
    });

    if (!donationRequest) {
      const existing = await DonationRequest.findById(id).lean();
      if (!existing) {
        return response.errorResponse(
          res,
          {},
          "Donation request not found",
          404,
        );
      }

      if (existing.status === "approved") {
        return response.errorResponse(
          res,
          {},
          "Donation request is already approved",
          400,
        );
      }

      return response.errorResponse(
        res,
        {},
        "Donation request cannot be approved",
        400,
      );
    }

    // Send thank you email after commit so approve/credit are not tied to email delivery
    const emailResult = await emailService.sendDonationThankYouEmail({
      donorName: donationRequest.donorName,
      email: donationRequest.email,
      amount: donationRequest.amount,
      paymentMode: donationRequest.paymentMode,
      date: new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });
    if (!emailResult.success) {
      console.error(
        "Failed to send donation thank you email:",
        emailResult.error,
      );
    }

    return response.successResponse(
      res,
      donationRequest,
      "Donation request approved successfully",
    );
  } catch (err) {
    console.error("Error approving donation request:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  } finally {
    await session.endSession();
  }
};

/**
 * @route PUT /api/admin/donation/requests/:id/reject
 * @desc Reject donation request (admin)
 * @access Private (Admin)
 */
const rejectDonationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(
        res,
        {},
        "Invalid resource identifier",
        400,
      );
    }

    const reason = String(rejectionReason || "").trim();
    if (!reason) {
      return response.errorResponse(
        res,
        [{ path: "rejectionReason", msg: "Rejection reason is required." }],
        "Validation Error",
        400,
      );
    }

    if (reason.length > 500) {
      return response.errorResponse(
        res,
        [{ path: "rejectionReason", msg: "Rejection reason must be at most 500 characters." }],
        "Validation Error",
        400,
      );
    }

    const donationRequest = await DonationRequest.findById(id);

    if (!donationRequest) {
      return response.errorResponse(
        res,
        {},
        "Donation request not found",
        404,
      );
    }

    if (donationRequest.status === "rejected") {
      return response.errorResponse(
        res,
        {},
        "Donation request is already rejected",
        400,
      );
    }

    donationRequest.status = "rejected";
    donationRequest.rejectionReason = reason;
    await donationRequest.save();

    return response.successResponse(
      res,
      donationRequest,
      "Donation request rejected successfully",
    );
  } catch (err) {
    console.error("Error rejecting donation request:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  // Public routes
  getActiveDonationButtons,
  getDonationSettings,
  getTopDonations,
  generateDonationQRCode,
  submitDonationRequest,
  // Admin routes
  getAdminDonationSettings,
  updateAdminDonationSettings,
  getAllDonationButtons,
  createDonationButton,
  updateDonationButton,
  deleteDonationButton,
  getAllDonationRequests,
  getDonationRequest,
  approveDonationRequest,
  rejectDonationRequest,
};
