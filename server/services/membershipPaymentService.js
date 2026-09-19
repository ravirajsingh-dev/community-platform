const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const User = require("../models/User");
const MembershipPlan = require("../models/MembershipPlan");
const PaymentHistory = require("../models/PaymentHistory");
const UserSubscription = require("../models/UserSubscription");
const CommonSettings = require("../models/CommonSettings");
const cashfree = require("./cashfreeClient");
const emailService = require("./email");
const { decryptPassword } = require("../utils/passwordEncryption");
const {
  extractPaymentMethod,
  cancelExistingPendingPayments,
  terminateCashfreeOrder,
} = require("../utils/paymentHelper");
const {
  getCashfreePaymentDetails,
  getCashfreeOrderDetails,
} = require("../utils/helper");
const {
  calculateRenewalDate,
  isSuccessfulCashfreePayment,
  isFailedCashfreePayment,
  parseCashfreePaymentsList,
  buildPaymentVerificationMeta,
  getWebhookOrderId,
  getWebhookPaymentDetails,
  ORDER_EXPIRY_MS,
  STALE_PENDING_PAYMENT_MS,
  isPaidCashfreeOrderStatus,
  isAdminLocalOrderId,
  isCashfreeOrderNotFoundError,
} = require("../utils/membershipHelper");
const { APP_PORTAL_URL } = require("../config/config");
const {
  logMembershipPaymentEvent,
  MEMBERSHIP_EVENT_TYPES,
} = require("../utils/paymentAuditLogger");
const {
  creditReferralCommissionIfEligible,
} = require("./referralCommissionService");
const {
  recordActiveReferralIfNeeded,
} = require("../utils/referralCountHelper");

const SUCCESS_WEBHOOK_TYPES = new Set([
  "PAYMENT_SUCCESS_WEBHOOK",
  "PAYMENT_USER_CONFIRMED_WEBHOOK",
]);

const FAILED_WEBHOOK_TYPES = new Set([
  "PAYMENT_FAILED_WEBHOOK",
  "PAYMENT_USER_DROPPED_WEBHOOK",
]);

const CASHFREE_SYNC_CACHE_TTL_MS = 3000;
const cashfreeSyncCache = new Map();

const clearCashfreeSyncCache = (orderId) => {
  if (!orderId) return;
  for (const key of cashfreeSyncCache.keys()) {
    if (key.startsWith(`${orderId}:`)) {
      cashfreeSyncCache.delete(key);
    }
  }
};

const generateOrderId = (userId) => {
  const suffix = uuidv4().replace(/-/g, "").slice(0, 12);
  return `RSF_${String(userId).slice(-8)}_${Date.now()}_${suffix}`;
};

const loadPendingPaymentByOrderId = async (orderId, session = null) => {
  const query = PaymentHistory.findOne({ orderId, status: "pending" });
  return session ? query.session(session) : query;
};

const loadPaymentForActivation = async (orderId, session = null) => {
  const query = PaymentHistory.findOne({
    orderId,
    status: { $in: ["pending", "failed"] },
  });
  return session ? query.session(session) : query;
};

const activateMembershipFromPayment = async ({
  paymentHistory,
  cfPaymentId,
  paymentMethod,
  session = null,
}) => {
  if (!session) {
    throw new Error("Membership activation requires a database transaction");
  }

  const userQuery = User.findById(paymentHistory.userId);
  const user = session ? await userQuery.session(session) : await userQuery;

  if (!user) {
    throw new Error("User not found for payment activation");
  }

  if (paymentHistory.status === "success") {
    return { user, alreadyActive: true, subscription: null };
  }

  // Lifetime members: still finalize the payment row so it never stays pending
  // (admin/local orders would otherwise loop forever in Cashfree reconciliation).
  if (user.isLifetimePaid && user.status === 1) {
    paymentHistory.status = "success";
    if (cfPaymentId) paymentHistory.cfPaymentId = String(cfPaymentId);
    if (paymentMethod) {
      paymentHistory.method = extractPaymentMethod(paymentMethod);
    }
    paymentHistory.remarks = paymentHistory.remarks
      ? `${paymentHistory.remarks} | Already active lifetime membership`
      : "Already active lifetime membership";

    if (session) {
      await paymentHistory.save({ session });
    } else {
      await paymentHistory.save();
    }

    return { user, alreadyActive: true, subscription: null };
  }

  const planQuery = MembershipPlan.findById(paymentHistory.selectedPlan);
  const plan = session ? await planQuery.session(session) : await planQuery;

  if (!plan) {
    throw new Error("Membership plan not found for payment activation");
  }

  const now = new Date();
  let startDate = now;

  if (
    user.isPaid &&
    user.status === 1 &&
    user.renewalDate &&
    new Date(user.renewalDate) > now &&
    !user.isLifetimePaid
  ) {
    startDate = new Date(user.renewalDate);
  }

  const renewalDate = calculateRenewalDate(plan, startDate);
  const isLifetime = plan.durationType === "lifetime";

  user.status = 1;
  user.isPaid = true;
  user.membershipPlanId = plan._id;
  user.subscriptionStartDate = startDate;
  user.renewalDate = renewalDate;
  user.isLifetimePaid = isLifetime;

  if (session) {
    await user.save({ session });
  } else {
    await user.save();
  }

  paymentHistory.status = "success";
  if (cfPaymentId) paymentHistory.cfPaymentId = String(cfPaymentId);
  if (paymentMethod) {
    paymentHistory.method = extractPaymentMethod(paymentMethod);
  }

  if (session) {
    await paymentHistory.save({ session });
  } else {
    await paymentHistory.save();
  }

  const subscription = new UserSubscription({
    userId: user._id,
    planId: plan._id,
    paymentHistoryId: paymentHistory._id,
    startDate,
    endDate: renewalDate,
    status: "active",
    amountPaid: paymentHistory.amount,
    autoRenew: false,
  });

  if (session) {
    await subscription.save({ session });
  } else {
    await subscription.save();
  }

  await creditReferralCommissionIfEligible({
    referredUser: user,
    paymentHistory,
    session,
  });

  // Count Active referral permanently (independent of commission settings).
  await recordActiveReferralIfNeeded(user, session);

  return { user, plan, subscription, alreadyActive: false };
};

const sendPaymentFailedEmail = async (user, planName) => {
  try {
    if (!user?.email) return;
    await emailService.sendMembershipPaymentFailedEmail({
      name: user.name,
      email: user.email,
      memberId: user.memberId,
      planName: planName || "Membership",
      portalUrl: APP_PORTAL_URL,
    });
  } catch (error) {
    console.error("Failed to send payment failed email:", error);
  }
};

const sendActivationWelcomeEmail = async (user, { isRenewal = false } = {}) => {
  try {
    if (!user?.email) return;

    if (isRenewal) {
      await emailService.sendMembershipRenewalEmail({
        name: user.name,
        email: user.email,
        memberId: user.memberId,
        portalUrl: APP_PORTAL_URL,
      });
      return;
    }

    const plainPassword = user.pwdRef ? decryptPassword(user.pwdRef) : null;
    if (!plainPassword) {
      return;
    }

    await emailService.sendActiveUserWelcomeEmail({
      name: user.name,
      email: user.email,
      memberId: user.memberId,
      password: plainPassword,
    });
  } catch (error) {
    console.error("Failed to send activation welcome email:", error);
  }
};

const markPaymentFailed = async ({
  paymentHistory,
  remarks,
  cfPaymentId,
  paymentMethod,
  session = null,
}) => {
  paymentHistory.status = "failed";
  if (cfPaymentId) paymentHistory.cfPaymentId = String(cfPaymentId);
  if (paymentMethod) {
    paymentHistory.method = extractPaymentMethod(paymentMethod);
  }
  if (remarks) {
    paymentHistory.remarks = paymentHistory.remarks
      ? `${paymentHistory.remarks} | ${remarks}`
      : remarks;
  }

  if (session) {
    await paymentHistory.save({ session });
  } else {
    await paymentHistory.save();
  }

  return paymentHistory;
};

const notifyPaymentFailed = async (paymentHistory, source) => {
  const user = paymentHistory.userId
    ? await User.findById(paymentHistory.userId).select("name email memberId")
    : null;
  const plan = paymentHistory.selectedPlan
    ? await MembershipPlan.findById(paymentHistory.selectedPlan).select("name")
    : null;

  if (user) {
    await sendPaymentFailedEmail(user, plan?.name);
  }

  logMembershipPaymentEvent({
    eventType: MEMBERSHIP_EVENT_TYPES.FAILED,
    status: "fail",
    userID: String(paymentHistory.userId || ""),
    details: {
      orderId: paymentHistory.orderId,
      source,
    },
  });
};

const finalizeFailedPayment = async ({
  paymentHistory,
  remarks,
  cfPaymentId,
  paymentMethod,
  source,
  sendEmail = true,
  terminateOrder = true,
}) => {
  if (paymentHistory.status !== "pending") {
    return paymentHistory;
  }

  if (terminateOrder && paymentHistory.orderId) {
    await terminateCashfreeOrder(cashfree, paymentHistory.orderId);
  }

  await markPaymentFailed({
    paymentHistory,
    remarks,
    cfPaymentId,
    paymentMethod,
  });

  if (sendEmail) {
    await notifyPaymentFailed(paymentHistory, source);
  } else {
    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.FAILED,
      status: "fail",
      userID: String(paymentHistory.userId || ""),
      details: {
        orderId: paymentHistory.orderId,
        source,
      },
    });
  }

  return PaymentHistory.findById(paymentHistory._id);
};

const processPaymentWebhook = async (webhookEvent, req = null) => {
  const webhookType = webhookEvent?.type || webhookEvent?.object?.type;
  const webhookObject = webhookEvent?.object || webhookEvent;
  const orderId = getWebhookOrderId(webhookObject);

  if (!orderId) {
    throw new Error("Webhook payload missing order_id");
  }

  const paymentHistory = await PaymentHistory.findOne({ orderId });
  if (!paymentHistory) {
    throw new Error(`Payment record not found for order ${orderId}`);
  }

  if (paymentHistory.status === "success") {
    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.WEBHOOK,
      status: "success",
      userID: String(paymentHistory.userId || ""),
      req,
      details: { orderId, webhookType, reason: "already_success" },
    });
    return { processed: false, reason: "already_success", orderId };
  }

  const paymentDetails = getWebhookPaymentDetails(webhookObject);

  if (
    SUCCESS_WEBHOOK_TYPES.has(webhookType) ||
    isSuccessfulCashfreePayment(paymentDetails.paymentStatus)
  ) {
    const session = await mongoose.startSession();
    let activationResult;

    try {
      await session.withTransaction(async () => {
        const payablePayment = await loadPaymentForActivation(orderId, session);
        if (!payablePayment) {
          const current = await PaymentHistory.findOne({ orderId }).session(
            session,
          );
          if (current?.status === "success") {
            activationResult = { alreadyActive: true, user: null };
            return;
          }
          throw new Error("No payable payment found for activation");
        }

        activationResult = await activateMembershipFromPayment({
          paymentHistory: payablePayment,
          cfPaymentId: paymentDetails.cfPaymentId,
          paymentMethod: paymentDetails.paymentMethod,
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    if (activationResult && !activationResult.alreadyActive) {
      const isRenewal = String(paymentHistory.remarks || "").includes("renewal");
      await sendActivationWelcomeEmail(activationResult.user, { isRenewal });
      logMembershipPaymentEvent({
        eventType: MEMBERSHIP_EVENT_TYPES.ACTIVATED,
        userID: String(activationResult.user?._id || paymentHistory.userId || ""),
        req,
        details: {
          orderId,
          webhookType,
          cfPaymentId: paymentDetails.cfPaymentId,
        },
      });
    }

    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.WEBHOOK,
      status: "success",
      userID: String(paymentHistory.userId || ""),
      req,
      details: {
        orderId,
        webhookType,
        activated: Boolean(activationResult && !activationResult.alreadyActive),
      },
    });

    return {
      processed: true,
      status: "success",
      orderId,
      userId: activationResult?.user?._id,
      alreadyActive: activationResult?.alreadyActive || false,
    };
  }

  if (FAILED_WEBHOOK_TYPES.has(webhookType)) {
    await terminateCashfreeOrder(cashfree, orderId);
    await markPaymentFailed({
      paymentHistory,
      remarks: `Webhook: ${webhookType}`,
      cfPaymentId: paymentDetails.cfPaymentId,
      paymentMethod: paymentDetails.paymentMethod,
    });

    await notifyPaymentFailed(paymentHistory, `webhook:${webhookType}`);

    return { processed: true, status: "failed", orderId };
  }

  logMembershipPaymentEvent({
    eventType: MEMBERSHIP_EVENT_TYPES.WEBHOOK,
    status: "success",
    userID: String(paymentHistory.userId || ""),
    req,
    details: { orderId, webhookType, reason: "ignored_event" },
  });

  return { processed: false, reason: "ignored_event", orderId, webhookType };
};

const syncPendingPaymentFromCashfree = async (
  paymentHistory,
  { fromReturn = false } = {},
) => {
  if (!paymentHistory?.orderId || paymentHistory.status !== "pending") {
    return {
      paymentHistory,
      verification: {
        state: paymentHistory.status === "success" ? "success" : "failed",
        shouldContinuePolling: false,
      },
    };
  }

  // Admin manual activation = payment bypass. Never sync/finalize via Cashfree reconcile.
  if (isAdminLocalOrderId(paymentHistory.orderId)) {
    return {
      paymentHistory,
      verification: {
        state: paymentHistory.status === "success" ? "success" : "waiting",
        shouldContinuePolling: false,
      },
    };
  }

  try {
    let orderStatus = null;
    let orderNotFound = false;

    try {
      const orderDetails = await getCashfreeOrderDetails(paymentHistory.orderId);
      orderStatus = orderDetails?.order_status || null;
    } catch (orderError) {
      if (isCashfreeOrderNotFoundError(orderError)) {
        orderNotFound = true;
      } else {
        // Order lookup is best-effort; payment list sync can still proceed.
        console.warn(
          `Failed to fetch Cashfree order ${paymentHistory.orderId}:`,
          orderError.message,
        );
      }
    }

    let payments = [];
    if (!orderNotFound) {
      try {
        const cashfreePayments = await getCashfreePaymentDetails(
          paymentHistory.orderId,
        );
        payments = parseCashfreePaymentsList(cashfreePayments);
      } catch (paymentError) {
        if (isCashfreeOrderNotFoundError(paymentError)) {
          orderNotFound = true;
        } else {
          throw paymentError;
        }
      }
    }

    // Order never existed at Cashfree (create failed, wrong env, or bogus id).
    if (orderNotFound) {
      const ageMs =
        Date.now() - new Date(paymentHistory.createdAt).getTime();
      if (fromReturn || ageMs >= STALE_PENDING_PAYMENT_MS) {
        const updated = await finalizeFailedPayment({
          paymentHistory,
          remarks: "Order not found at payment gateway",
          source: "status_poll_order_not_found",
          sendEmail: false,
          terminateOrder: false,
        });
        clearCashfreeSyncCache(paymentHistory.orderId);
        return {
          paymentHistory: updated,
          verification: { state: "stale", shouldContinuePolling: false },
        };
      }

      return {
        paymentHistory,
        verification: {
          state: "waiting",
          shouldContinuePolling: Boolean(fromReturn),
        },
      };
    }

    const verification = buildPaymentVerificationMeta(
      payments,
      paymentHistory,
      {
        fromReturn,
        orderStatus,
      },
    );

    const successfulPayment = payments.find((payment) =>
      isSuccessfulCashfreePayment(payment?.payment_status),
    );

    const shouldActivate =
      Boolean(successfulPayment) ||
      (isPaidCashfreeOrderStatus(orderStatus) &&
        verification.state === "success");

    if (shouldActivate) {
      const session = await mongoose.startSession();
      let activationResult;

      try {
        await session.withTransaction(async () => {
          const pendingPayment = await loadPendingPaymentByOrderId(
            paymentHistory.orderId,
            session,
          );
          if (!pendingPayment) {
            return;
          }

          activationResult = await activateMembershipFromPayment({
            paymentHistory: pendingPayment,
            cfPaymentId: successfulPayment?.cf_payment_id,
            paymentMethod: successfulPayment?.payment_method || "Other",
            session,
          });
        });
      } finally {
        await session.endSession();
      }

      if (activationResult && !activationResult.alreadyActive) {
        const isRenewal = String(paymentHistory.remarks || "").includes(
          "renewal",
        );
        await sendActivationWelcomeEmail(activationResult.user, { isRenewal });
        logMembershipPaymentEvent({
          eventType: MEMBERSHIP_EVENT_TYPES.SYNC,
          userID: String(
            activationResult.user?._id || paymentHistory.userId || "",
          ),
          details: { orderId: paymentHistory.orderId, source: "status_poll" },
        });
      }

      const updated = await PaymentHistory.findById(paymentHistory._id);
      clearCashfreeSyncCache(paymentHistory.orderId);
      return {
        paymentHistory: updated,
        verification: { state: "success", shouldContinuePolling: false },
      };
    }

    // Never force-fail or terminate while Cashfree still has an in-flight payment.
    if (verification.state === "processing") {
      return { paymentHistory, verification };
    }

    const failedPayment = payments.find((payment) =>
      isFailedCashfreePayment(payment?.payment_status),
    );

    if (failedPayment || verification.state === "failed") {
      const updated = await finalizeFailedPayment({
        paymentHistory,
        remarks: "Status poll: payment failed at gateway",
        cfPaymentId: failedPayment?.cf_payment_id,
        paymentMethod: failedPayment?.payment_method,
        source: "status_poll",
      });
      clearCashfreeSyncCache(paymentHistory.orderId);
      return {
        paymentHistory: updated,
        verification: { state: "failed", shouldContinuePolling: false },
      };
    }

    if (verification.state === "abandoned") {
      const updated = await finalizeFailedPayment({
        paymentHistory,
        remarks: "Payment abandoned - no payment attempt at gateway",
        source: "status_poll_abandoned",
        sendEmail: false,
      });
      clearCashfreeSyncCache(paymentHistory.orderId);
      return {
        paymentHistory: updated,
        verification: { state: "abandoned", shouldContinuePolling: false },
      };
    }

    if (verification.state === "stale") {
      const updated = await finalizeFailedPayment({
        paymentHistory,
        remarks: "Stale pending payment - no gateway activity",
        source: "reconciliation_stale",
        sendEmail: false,
      });
      clearCashfreeSyncCache(paymentHistory.orderId);
      return {
        paymentHistory: updated,
        verification: { state: "stale", shouldContinuePolling: false },
      };
    }

    return { paymentHistory, verification };
  } catch (error) {
    console.error("Failed to sync payment from Cashfree:", error.message);
    return {
      paymentHistory,
      verification: {
        state: "gateway_unreachable",
        shouldContinuePolling: fromReturn,
      },
    };
  }
};

const getCachedCashfreeSync = async (paymentHistory, options) => {
  const cacheKey = `${paymentHistory.orderId}:${options.fromReturn ? "return" : "poll"}`;
  const cached = cashfreeSyncCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CASHFREE_SYNC_CACHE_TTL_MS) {
    return cached.result;
  }

  const result = await syncPendingPaymentFromCashfree(paymentHistory, options);
  cashfreeSyncCache.set(cacheKey, { result, at: Date.now() });
  return result;
};

const createMembershipOrder = async ({ userId, planId, isRenewal = false }) => {
  const settings = await CommonSettings.getOrCreateSettings();
  if (!settings.paymentGateway?.enabled) {
    throw new Error("Payment gateway is disabled");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw new Error("Invalid plan ID");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.isLifetimePaid && user.status === 1) {
    throw new Error("Lifetime membership does not require renewal");
  }

  if (!isRenewal && user.isPaid && user.status === 1) {
    throw new Error("User membership is already active");
  }

  const plan = await MembershipPlan.findOne({ _id: planId, isActive: true });
  if (!plan) {
    throw new Error("Selected membership plan is not available");
  }

  if (
    !isRenewal &&
    user.status === 4 &&
    user.membershipPlanId &&
    String(user.membershipPlanId) !== String(plan._id)
  ) {
    throw new Error("Selected plan does not match the user's registration plan");
  }

  const session = await mongoose.startSession();
  let paymentHistory;
  let orderResponse;

  try {
    await session.withTransaction(async () => {
      await cancelExistingPendingPayments(user._id, cashfree, session);

      const orderId = generateOrderId(user._id);
      const returnPath = isRenewal
        ? "/user/dashboard?order_id={order_id}"
        : "/register?order_id={order_id}";
      const orderRequest = {
        order_amount: plan.price,
        order_currency: plan.currency || "INR",
        order_id: orderId,
        order_expiry_time: new Date(Date.now() + ORDER_EXPIRY_MS).toISOString(),
        customer_details: {
          customer_id: String(user._id),
          customer_phone: user.phone,
          customer_email: user.email || undefined,
          customer_name: user.name,
        },
        order_meta: {
          return_url: `${APP_PORTAL_URL}${returnPath}`,
        },
        order_note: isRenewal
          ? `Membership renewal: ${plan.name}`
          : `Membership plan: ${plan.name}`,
      };

      orderResponse = await cashfree.PGCreateOrder(orderRequest);
      const orderData = orderResponse?.data || {};

      paymentHistory = new PaymentHistory({
        userId: user._id,
        userName: user.name,
        paymentId: orderId,
        paymentType: "Activation",
        amount: plan.price,
        method: "UPI",
        status: "pending",
        orderId,
        paymentSessionId: orderData.payment_session_id,
        selectedPlan: plan._id,
        remarks: isRenewal
          ? `Membership renewal: ${plan.name}`
          : `Membership registration: ${plan.name}`,
      });

      await paymentHistory.save({ session });

      if (!user.membershipPlanId) {
        user.membershipPlanId = plan._id;
        await user.save({ session });
      }
    });
  } finally {
    await session.endSession();
  }

  logMembershipPaymentEvent({
    eventType: MEMBERSHIP_EVENT_TYPES.ORDER_CREATED,
    userID: String(userId),
    details: {
      orderId: paymentHistory.orderId,
      planId: String(planId),
      amount: plan.price,
      isRenewal,
    },
  });

  const orderData = orderResponse?.data || {};

  return {
    orderId: paymentHistory.orderId,
    paymentSessionId: orderData.payment_session_id,
    amount: plan.price,
    currency: plan.currency || "INR",
    plan: {
      _id: plan._id,
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      durationType: plan.durationType,
      durationValue: plan.durationValue,
    },
    paymentHistoryId: paymentHistory._id,
  };
};

const getPaymentStatusResponse = async (orderId, { fromReturn = false } = {}) => {
  let paymentHistory = await PaymentHistory.findOne({ orderId }).populate(
    "selectedPlan",
    "name slug price durationType durationValue currency",
  );

  if (!paymentHistory) {
    return null;
  }

  let verification = {
    state: paymentHistory.status === "pending" ? "waiting" : "terminal",
    shouldContinuePolling: false,
  };

  if (paymentHistory.status === "pending") {
    const syncResult = await getCachedCashfreeSync(paymentHistory, {
      fromReturn,
    });
    verification = syncResult.verification;
    paymentHistory = await PaymentHistory.findById(
      syncResult.paymentHistory._id,
    ).populate(
      "selectedPlan",
      "name slug price durationType durationValue currency",
    );

    if (paymentHistory.status !== "pending") {
      if (verification.state !== "abandoned") {
        verification = {
          state: paymentHistory.status === "success" ? "success" : "failed",
          shouldContinuePolling: false,
        };
      }
    }
  } else {
    verification = {
      state: paymentHistory.status === "success" ? "success" : "failed",
      shouldContinuePolling: false,
    };
  }

  const user = paymentHistory.userId
    ? await User.findById(paymentHistory.userId).select(
        "memberId name email status isPaid renewalDate isLifetimePaid membershipPlanId subscriptionStartDate",
      )
    : null;

  return {
    status: paymentHistory.status,
    orderId: paymentHistory.orderId,
    amount: paymentHistory.amount,
    paymentSessionId: paymentHistory.paymentSessionId,
    cfPaymentId: paymentHistory.cfPaymentId,
    plan: paymentHistory.selectedPlan || null,
    user,
    verification,
  };
};

module.exports = {
  generateOrderId,
  activateMembershipFromPayment,
  markPaymentFailed,
  processPaymentWebhook,
  syncPendingPaymentFromCashfree,
  createMembershipOrder,
  getPaymentStatusResponse,
  loadPaymentForActivation,
  SUCCESS_WEBHOOK_TYPES,
  FAILED_WEBHOOK_TYPES,
};
