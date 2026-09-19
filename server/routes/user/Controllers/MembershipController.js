const { validationResult } = require("express-validator");
const User = require("../../../models/User");
const UserSubscription = require("../../../models/UserSubscription");
const PaymentHistory = require("../../../models/PaymentHistory");
const {
  getMembershipAccessState,
  getDaysUntilExpiry,
  formatPublicPlan,
} = require("../../../utils/membershipHelper");
const {
  createMembershipOrder,
} = require("../../../services/membershipPaymentService");
const response = require("../../../config/response");

const getMembership = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        "status isPaid isLifetimePaid renewalDate subscriptionStartDate membershipPlanId memberId name",
      )
      .populate("membershipPlanId")
      .lean();

    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    const access = getMembershipAccessState(user);
    const plan = user.membershipPlanId;

    const subscriptions = await UserSubscription.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("planId", "name slug price durationType durationValue")
      .populate("paymentHistoryId", "paymentId status amount createdAt")
      .lean();

    const hasPendingPayment = Boolean(
      await PaymentHistory.exists({
        userId: user._id,
        paymentType: "Activation",
        status: "pending",
      }),
    );

    return response.successResponse(
      res,
      {
        membershipStatus: access.membershipStatus,
        code: access.code,
        isActive: access.allowed,
        hasPendingPayment,
        daysUntilExpiry: user.isLifetimePaid
          ? null
          : getDaysUntilExpiry(user.renewalDate),
        plan: plan
          ? formatPublicPlan(plan)
          : null,
        renewalDate: user.renewalDate,
        subscriptionStartDate: user.subscriptionStartDate,
        isLifetimePaid: user.isLifetimePaid,
        isPaid: user.isPaid,
        status: user.status,
        subscriptions,
      },
      "Membership details retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching membership:", error);
    return response.errorResponse(res, {}, "Failed to fetch membership", 500);
  }
};

const getMembershipPayments = async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
    } = req.query;

    const pageSize = Math.min(parseInt(limit, 10) || 20, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = pageSize * (currentPage - 1);
    const sortOrder = ascending === "asc" ? 1 : -1;
    const allowedOrderFields = ["createdAt", "amount", "status"];
    const sortField = allowedOrderFields.includes(orderBy) ? orderBy : "createdAt";

    const query = {
      userId: req.user.id,
      paymentType: "Activation",
    };

    const [data, totalRecord] = await Promise.all([
      PaymentHistory.find(query)
        .sort({ [sortField]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .select("paymentId status amount orderId createdAt method")
        .lean(),
      PaymentHistory.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      {
        data,
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: totalRecord,
          pages: Math.ceil(totalRecord / pageSize) || 0,
        },
      },
      "Membership payments fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching membership payments:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch membership payments",
      500,
    );
  }
};

const renewMembership = async (req, res) => {
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

    const { planId } = req.body;

    const order = await createMembershipOrder({
      userId: req.user.id,
      planId,
      isRenewal: true,
    });

    return response.successResponse(
      res,
      order,
      "Renewal payment order created successfully",
    );
  } catch (error) {
    console.error("Error creating renewal order:", error);
    return response.errorResponse(
      res,
      [{ msg: error.message || "Failed to create renewal order" }],
      error.message || "Failed to create renewal order",
      400,
    );
  }
};

module.exports = {
  getMembership,
  getMembershipPayments,
  renewMembership,
};
