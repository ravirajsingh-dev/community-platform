const { validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const response = require("../../../config/response");
const User = require("../../../models/User");
const MembershipPlan = require("../../../models/MembershipPlan");
const PaymentHistory = require("../../../models/PaymentHistory");
const UserSubscription = require("../../../models/UserSubscription");
const Session = require("../../../models/Session");
const {
  activateMembershipFromPayment,
} = require("../../../services/membershipPaymentService");
const {
  logMembershipPaymentEvent,
  MEMBERSHIP_EVENT_TYPES,
} = require("../../../utils/paymentAuditLogger");
const {
  recordActiveReferralIfNeeded,
} = require("../../../utils/referralCountHelper");

const getUserIdParam = (req) => req.params.user_id || req.params.userId;

const validateUserId = (userId) => mongoose.Types.ObjectId.isValid(userId);

const createAdminActivationPayment = async ({
  user,
  plan,
  remarks,
  amount,
  isRenewal = false,
}) => {
  const orderId = `ADMIN_${String(user._id).slice(-8)}_${Date.now()}_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
  const paymentAmount =
    typeof amount === "number" && amount >= 0 ? amount : plan.price;
  const actionLabel = isRenewal ? "renewal" : "activation";

  const session = await mongoose.startSession();
  let paymentHistory;
  let activationResult;

  try {
    await session.withTransaction(async () => {
      paymentHistory = new PaymentHistory({
        userId: user._id,
        userName: user.name,
        paymentId: orderId,
        paymentType: "Activation",
        amount: paymentAmount,
        method: "Other",
        status: "pending",
        orderId,
        selectedPlan: plan._id,
        remarks: remarks
          ? `Admin manual ${actionLabel}: ${remarks}`
          : `Admin manual ${actionLabel}`,
      });

      await paymentHistory.save({ session });

      activationResult = await activateMembershipFromPayment({
        paymentHistory,
        paymentMethod: "Other",
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return { paymentHistory, activationResult, orderId };
};

/**
 * POST /admin/users/:user_id/membership/activate
 * Select a plan and activate membership for any user.
 */
const activateUserMembership = async (req, res) => {
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

    const userId = getUserIdParam(req);
    if (!validateUserId(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid user id" },
        "Invalid user id",
        400,
      );
    }

    const { planId, remarks, amount } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    if (user.status === 3) {
      return response.errorResponse(
        res,
        {},
        "User is blocked. Unblock the user before activating membership.",
        400,
      );
    }

    if (user.isLifetimePaid && user.status === 1) {
      return response.errorResponse(
        res,
        {},
        "User already has an active lifetime membership",
        400,
      );
    }

    const plan = await MembershipPlan.findOne({ _id: planId, isActive: true });
    if (!plan) {
      return response.errorResponse(res, {}, "Plan not found or inactive", 404);
    }

    const { paymentHistory, activationResult, orderId } =
      await createAdminActivationPayment({
        user,
        plan,
        remarks,
        amount,
        isRenewal: false,
      });

    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.ADMIN_OVERRIDE,
      adminID: String(req.user?.id || ""),
      userID: String(user._id),
      req,
      details: {
        action: "activate",
        paymentId: paymentHistory._id,
        planId: plan._id,
        orderId,
        remarks,
      },
    });

    return response.successResponse(
      res,
      {
        payment: paymentHistory,
        user: activationResult.user,
        plan,
      },
      "User membership activated successfully",
    );
  } catch (error) {
    console.error("Error activating user membership:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to activate membership" }],
      error.message || "Failed to activate membership",
      400,
    );
  }
};

/**
 * POST /admin/users/:user_id/membership/renew
 * Renew membership with selected (or current) plan.
 */
const renewUserMembership = async (req, res) => {
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

    const userId = getUserIdParam(req);
    if (!validateUserId(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid user id" },
        "Invalid user id",
        400,
      );
    }

    const { planId, remarks, amount } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    if (user.status === 3) {
      return response.errorResponse(
        res,
        {},
        "User is blocked. Unblock the user before renewing membership.",
        400,
      );
    }

    if (user.isLifetimePaid && user.status === 1) {
      return response.errorResponse(
        res,
        {},
        "Lifetime membership cannot be renewed",
        400,
      );
    }

    const resolvedPlanId = planId || user.membershipPlanId;
    if (!resolvedPlanId) {
      return response.errorResponse(
        res,
        {},
        "Plan ID is required when user has no existing membership plan",
        400,
      );
    }

    const plan = await MembershipPlan.findOne({
      _id: resolvedPlanId,
      isActive: true,
    });
    if (!plan) {
      return response.errorResponse(res, {}, "Plan not found or inactive", 404);
    }

    const { paymentHistory, activationResult, orderId } =
      await createAdminActivationPayment({
        user,
        plan,
        remarks,
        amount,
        isRenewal: true,
      });

    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.ADMIN_OVERRIDE,
      adminID: String(req.user?.id || ""),
      userID: String(user._id),
      req,
      details: {
        action: "renew",
        paymentId: paymentHistory._id,
        planId: plan._id,
        orderId,
        remarks,
      },
    });

    return response.successResponse(
      res,
      {
        payment: paymentHistory,
        user: activationResult.user,
        plan,
      },
      "User membership renewed successfully",
    );
  } catch (error) {
    console.error("Error renewing user membership:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to renew membership" }],
      error.message || "Failed to renew membership",
      400,
    );
  }
};

/**
 * POST /admin/users/:user_id/membership/block
 * Temporarily block the user account (status = 3).
 */
const blockUserMembership = async (req, res) => {
  try {
    const userId = getUserIdParam(req);
    if (!validateUserId(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid user id" },
        "Invalid user id",
        400,
      );
    }

    const { remarks } = req.body || {};

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    if (user.status === 3) {
      return response.errorResponse(res, {}, "User is already blocked", 400);
    }

    user.status = 3;
    await user.save();
    await Session.deleteMany({ userID: userId });

    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.ADMIN_OVERRIDE,
      adminID: String(req.user?.id || ""),
      userID: String(user._id),
      req,
      details: { action: "block", remarks: remarks || null },
    });

    return response.successResponse(
      res,
      {
        _id: user._id,
        memberId: user.memberId,
        name: user.name,
        status: user.status,
        isPaid: user.isPaid,
        isLifetimePaid: user.isLifetimePaid,
        renewalDate: user.renewalDate,
        membershipPlanId: user.membershipPlanId,
      },
      "User blocked successfully",
    );
  } catch (error) {
    console.error("Error blocking user:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to block user" }],
      error.message || "Failed to block user",
      400,
    );
  }
};

/**
 * POST /admin/users/:user_id/membership/unblock
 * Restore blocked user to Active (if paid) or Inactive.
 */
const unblockUserMembership = async (req, res) => {
  try {
    const userId = getUserIdParam(req);
    if (!validateUserId(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid user id" },
        "Invalid user id",
        400,
      );
    }

    const { remarks } = req.body || {};

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    if (user.status !== 3) {
      return response.errorResponse(res, {}, "User is not blocked", 400);
    }

    const now = Date.now();
    const hasActivePaidMembership =
      user.isLifetimePaid ||
      (user.isPaid &&
        user.renewalDate &&
        new Date(user.renewalDate).getTime() > now);

    user.status = hasActivePaidMembership ? 1 : 2;
    await user.save();

    if (user.status === 1) {
      await recordActiveReferralIfNeeded(user);
    }

    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.ADMIN_OVERRIDE,
      adminID: String(req.user?.id || ""),
      userID: String(user._id),
      req,
      details: {
        action: "unblock",
        restoredStatus: user.status,
        remarks: remarks || null,
      },
    });

    return response.successResponse(
      res,
      {
        _id: user._id,
        memberId: user.memberId,
        name: user.name,
        status: user.status,
        isPaid: user.isPaid,
        isLifetimePaid: user.isLifetimePaid,
        renewalDate: user.renewalDate,
        membershipPlanId: user.membershipPlanId,
      },
      "User unblocked successfully",
    );
  } catch (error) {
    console.error("Error unblocking user:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to unblock user" }],
      error.message || "Failed to unblock user",
      400,
    );
  }
};

/**
 * POST /admin/users/:user_id/membership/expire
 * Force-expire membership (status = Inactive, isPaid = false).
 */
const expireUserMembership = async (req, res) => {
  try {
    const userId = getUserIdParam(req);
    if (!validateUserId(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid user id" },
        "Invalid user id",
        400,
      );
    }

    const { remarks } = req.body || {};

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    if (user.status === 3) {
      return response.errorResponse(
        res,
        {},
        "User is blocked. Unblock first or leave blocked.",
        400,
      );
    }

    if (!user.isPaid && user.status === 2 && !user.isLifetimePaid) {
      return response.errorResponse(
        res,
        {},
        "Membership is already expired / inactive",
        400,
      );
    }

    const now = new Date();

    user.status = 2;
    user.isPaid = false;
    user.isLifetimePaid = false;
    if (user.renewalDate && new Date(user.renewalDate).getTime() > now.getTime()) {
      user.renewalDate = now;
    }

    await user.save();

    await UserSubscription.updateMany(
      { userId: user._id, status: "active" },
      { $set: { status: "expired" } },
    );

    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.EXPIRED,
      adminID: String(req.user?.id || ""),
      userID: String(user._id),
      req,
      details: {
        action: "admin_expire",
        memberId: user.memberId,
        remarks: remarks || null,
      },
    });

    return response.successResponse(
      res,
      {
        _id: user._id,
        memberId: user.memberId,
        name: user.name,
        status: user.status,
        isPaid: user.isPaid,
        isLifetimePaid: user.isLifetimePaid,
        renewalDate: user.renewalDate,
        membershipPlanId: user.membershipPlanId,
      },
      "User membership expired successfully",
    );
  } catch (error) {
    console.error("Error expiring user membership:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to expire membership" }],
      error.message || "Failed to expire membership",
      400,
    );
  }
};

module.exports = {
  activateUserMembership,
  renewUserMembership,
  blockUserMembership,
  unblockUserMembership,
  expireUserMembership,
};
