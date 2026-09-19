const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const PaymentHistory = require("../../../models/PaymentHistory");
const User = require("../../../models/User");
const MembershipPlan = require("../../../models/MembershipPlan");
const response = require("../../../config/response");
const {
  activateMembershipFromPayment,
  markPaymentFailed,
} = require("../../../services/membershipPaymentService");
const {
  logMembershipPaymentEvent,
  MEMBERSHIP_EVENT_TYPES,
} = require("../../../utils/paymentAuditLogger");

const parseDateFilter = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPaymentsQuery = async (query = {}) => {
  const {
    status,
    fromDate,
    toDate,
    planId,
    memberId,
    name,
    paymentType = "Activation",
  } = query;

  const mongoQuery = {};

  if (paymentType) {
    mongoQuery.paymentType = paymentType;
  }

  if (status && ["success", "failed", "pending"].includes(String(status))) {
    mongoQuery.status = status;
  }

  if (planId && mongoose.Types.ObjectId.isValid(planId)) {
    mongoQuery.selectedPlan = planId;
  }

  const from = parseDateFilter(fromDate);
  const to = parseDateFilter(toDate, true);
  if (from || to) {
    mongoQuery.createdAt = {};
    if (from) mongoQuery.createdAt.$gte = from;
    if (to) mongoQuery.createdAt.$lte = to;
  }

  if (name && String(name).trim()) {
    mongoQuery.userName = {
      $regex: escapeRegex(String(name).trim()),
      $options: "i",
    };
  }

  if (memberId && String(memberId).trim()) {
    const users = await User.find({
      memberId: {
        $regex: escapeRegex(String(memberId).trim()),
        $options: "i",
      },
    })
      .select("_id")
      .lean();

    mongoQuery.userId = { $in: users.map((user) => user._id) };
  }

  return mongoQuery;
};

const getAdminPayments = async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
    } = req.query;

    const pageSize = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = pageSize * (Math.max(parseInt(page, 10) || 1, 1) - 1);
    const sortOrder = ascending === "asc" ? 1 : -1;
    const allowedOrderFields = ["createdAt", "amount", "status", "userName"];
    const sortField = allowedOrderFields.includes(orderBy) ? orderBy : "createdAt";

    const query = await buildPaymentsQuery(req.query);

    const [data, totalRecord] = await Promise.all([
      PaymentHistory.find(query)
        .populate("selectedPlan", "name slug price durationType durationValue")
        .populate("userId", "memberId name phone email status isPaid")
        .sort({ [sortField]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      PaymentHistory.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      {
        data,
        pagination: {
          page: Math.max(parseInt(page, 10) || 1, 1),
          limit: pageSize,
          total: totalRecord,
          pages: Math.ceil(totalRecord / pageSize) || 0,
        },
      },
      "Payments fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching admin payments:", error);
    return response.errorResponse(res, {}, "Failed to fetch payments", 500);
  }
};

const getAdminPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid payment ID", 400);
    }

    const payment = await PaymentHistory.findById(id)
      .populate("selectedPlan", "name slug price durationType durationValue currency")
      .populate(
        "userId",
        "memberId name phone email status isPaid renewalDate isLifetimePaid membershipPlanId subscriptionStartDate",
      )
      .lean();

    if (!payment) {
      return response.errorResponse(res, {}, "Payment not found", 404);
    }

    return response.successResponse(res, payment, "Payment fetched successfully");
  } catch (error) {
    console.error("Error fetching payment:", error);
    return response.errorResponse(res, {}, "Failed to fetch payment", 500);
  }
};

const getAdminPaymentStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const baseMatch = { paymentType: "Activation" };

    const [todaySuccess, pendingCount, successCount, totalRevenueAgg] =
      await Promise.all([
        PaymentHistory.aggregate([
          {
            $match: {
              ...baseMatch,
              status: "success",
              createdAt: { $gte: startOfToday },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        PaymentHistory.countDocuments({ ...baseMatch, status: "pending" }),
        PaymentHistory.countDocuments({ ...baseMatch, status: "success" }),
        PaymentHistory.aggregate([
          { $match: { ...baseMatch, status: "success" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

    const todayStats = todaySuccess[0] || { total: 0, count: 0 };
    const revenueStats = totalRevenueAgg[0] || { total: 0 };

    return response.successResponse(
      res,
      {
        todayRevenue: todayStats.total || 0,
        todayTransactions: todayStats.count || 0,
        pendingPayments: pendingCount,
        successfulPayments: successCount,
        totalRevenue: revenueStats.total || 0,
      },
      "Payment stats fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    return response.errorResponse(res, {}, "Failed to fetch payment stats", 500);
  }
};

const updatePaymentStatus = async (req, res) => {
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

    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid payment ID", 400);
    }

    let payment = await PaymentHistory.findById(id);
    if (!payment) {
      return response.errorResponse(res, {}, "Payment not found", 404);
    }

    if (payment.status === status) {
      return response.successResponse(
        res,
        payment,
        `Payment is already marked as ${status}`,
      );
    }

    const adminRemark = remarks
      ? `Admin override: ${remarks}`
      : "Admin override";

    if (status === "success") {
      const session = await mongoose.startSession();
      let activationResult;

      try {
        await session.withTransaction(async () => {
          payment = await PaymentHistory.findById(id).session(session);
          if (!payment) {
            throw new Error("Payment not found");
          }

          if (adminRemark) {
            payment.remarks = payment.remarks
              ? `${payment.remarks} | ${adminRemark}`
              : adminRemark;
          }

          activationResult = await activateMembershipFromPayment({
            paymentHistory: payment,
            paymentMethod: "Other",
            session,
          });
        });
      } finally {
        await session.endSession();
      }

      logMembershipPaymentEvent({
        eventType: MEMBERSHIP_EVENT_TYPES.ADMIN_OVERRIDE,
        adminID: String(req.user?.id || ""),
        userID: String(payment.userId || ""),
        req,
        details: { paymentId: payment._id, status: "success", remarks },
      });

      return response.successResponse(
        res,
        {
          payment,
          user: activationResult.user,
          alreadyActive: activationResult.alreadyActive,
        },
        "Payment marked successful and membership activated",
      );
    }

    if (status === "failed") {
      await markPaymentFailed({
        paymentHistory: payment,
        remarks: adminRemark,
      });

      logMembershipPaymentEvent({
        eventType: MEMBERSHIP_EVENT_TYPES.ADMIN_OVERRIDE,
        adminID: String(req.user?.id || ""),
        userID: String(payment.userId || ""),
        req,
        details: { paymentId: payment._id, status: "failed", remarks },
      });

      return response.successResponse(
        res,
        payment,
        "Payment marked as failed",
      );
    }

    return response.errorResponse(res, {}, "Invalid status value", 400);
  } catch (error) {
    console.error("Error updating payment status:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to update payment status" }],
      error.message || "Failed to update payment status",
      400,
    );
  }
};

const manualActivatePayment = async (req, res) => {
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

    const { userId, planId, remarks, amount } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    const plan = await MembershipPlan.findOne({ _id: planId, isActive: true });
    if (!plan) {
      return response.errorResponse(res, {}, "Plan not found or inactive", 404);
    }

    const orderId = `ADMIN_${String(userId).slice(-8)}_${Date.now()}_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
    const paymentAmount =
      typeof amount === "number" && amount >= 0 ? amount : plan.price;

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
            ? `Admin manual activation: ${remarks}`
            : "Admin manual activation",
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

    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.ADMIN_OVERRIDE,
      adminID: String(req.user?.id || ""),
      userID: String(user._id),
      req,
      details: {
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
      "User membership manually activated",
    );
  } catch (error) {
    console.error("Error manually activating payment:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to manually activate membership" }],
      error.message || "Failed to manually activate membership",
      400,
    );
  }
};

module.exports = {
  getAdminPayments,
  getAdminPaymentById,
  getAdminPaymentStats,
  updatePaymentStatus,
  manualActivatePayment,
};
