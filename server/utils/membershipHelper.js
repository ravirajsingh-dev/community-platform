const MembershipPlan = require("../models/MembershipPlan");
const CommonSettings = require("../models/CommonSettings");

const slugifyPlanPart = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const generatePlanSlug = (name, price, durationType, durationValue) => {
  const parts = [
    slugifyPlanPart(name),
    slugifyPlanPart(price),
    slugifyPlanPart(durationType),
  ];

  if (durationType !== "lifetime") {
    parts.push(slugifyPlanPart(durationValue));
  }

  return parts.filter(Boolean).join("_").slice(0, 100);
};

const formatPublicPlan = (plan) => ({
  _id: plan._id,
  name: plan.name,
  slug: plan.slug,
  price: plan.price,
  currency: plan.currency || "INR",
  durationType: plan.durationType,
  durationValue: plan.durationValue,
});

const calculateRenewalDate = (plan, startDate = new Date()) => {
  if (!plan || plan.durationType === "lifetime") {
    return null;
  }

  const start = new Date(startDate);
  const renewal = new Date(start);

  switch (plan.durationType) {
    case "days":
      renewal.setDate(renewal.getDate() + plan.durationValue);
      break;
    case "months":
      renewal.setMonth(renewal.getMonth() + plan.durationValue);
      break;
    case "years":
      renewal.setFullYear(renewal.getFullYear() + plan.durationValue);
      break;
    default:
      return null;
  }

  return renewal;
};

const getActivePlanCount = async () => {
  return MembershipPlan.countDocuments({ isActive: true });
};

const isSuccessfulCashfreePayment = (paymentStatus) => {
  if (!paymentStatus) return false;
  const normalized = String(paymentStatus).toUpperCase();
  return ["SUCCESS", "PAID", "COMPLETED"].includes(normalized);
};

const isFailedCashfreePayment = (paymentStatus) => {
  if (!paymentStatus) return false;
  const normalized = String(paymentStatus).toUpperCase();
  return ["FAILED", "CANCELLED", "USER_DROPPED", "VOID", "EXPIRED"].includes(
    normalized,
  );
};

const isPendingCashfreePayment = (paymentStatus) => {
  if (!paymentStatus) return false;
  const normalized = String(paymentStatus).toUpperCase();
  return ["PENDING", "INITIATED", "IN_PROGRESS", "FLAGGED"].includes(normalized);
};

const parseCashfreePaymentsList = (cashfreePayments) => {
  if (Array.isArray(cashfreePayments)) {
    return cashfreePayments;
  }
  return cashfreePayments?.payments || cashfreePayments?.data || [];
};

/**
 * How long a Cashfree order stays payable after creation.
 * Cashfree requires expiry strictly more than 15 minutes from now
 * (exactly 15m returns order_expiry_time_invalid).
 */
const ORDER_EXPIRY_MS = 20 * 60 * 1000;

/**
 * After this age (aligned with order expiry), pending rows with no in-flight
 * gateway payment are treated as stale and finalized as failed.
 */
const STALE_PENDING_PAYMENT_MS = ORDER_EXPIRY_MS;

const isClosedCashfreeOrderStatus = (orderStatus) => {
  const normalized = String(orderStatus || "").toUpperCase();
  return ["EXPIRED", "TERMINATED"].includes(normalized);
};

const isPaidCashfreeOrderStatus = (orderStatus) =>
  String(orderStatus || "").toUpperCase() === "PAID";

/**
 * Local-only order ids never created on Cashfree
 * (admin manual activate/renew, or client wallet-funded membership create).
 */
const isAdminLocalOrderId = (orderId) => {
  const id = String(orderId || "");
  return id.startsWith("ADMIN_") || id.startsWith("WALLET_");
};

/** Cashfree returns 404 / order_not_found when the order id was never created. */
const isCashfreeOrderNotFoundError = (error) => {
  const status = error?.response?.status;
  const code = String(error?.response?.data?.code || "").toLowerCase();
  return status === 404 || code === "order_not_found";
};

const buildPaymentVerificationMeta = (
  payments,
  paymentHistory,
  { fromReturn = false, orderStatus = null } = {},
) => {
  if (payments.some((payment) => isSuccessfulCashfreePayment(payment?.payment_status))) {
    return { state: "success", shouldContinuePolling: false };
  }

  // In-flight gateway payments must win over failed attempts / closed orders
  // (Cashfree TTL can keep a payment alive after order_expiry_time).
  if (payments.some((payment) => isPendingCashfreePayment(payment?.payment_status))) {
    return { state: "processing", shouldContinuePolling: true };
  }

  if (payments.some((payment) => isFailedCashfreePayment(payment?.payment_status))) {
    return { state: "failed", shouldContinuePolling: false };
  }

  if (isPaidCashfreeOrderStatus(orderStatus)) {
    return { state: "success", shouldContinuePolling: false };
  }

  const ageMs = Date.now() - new Date(paymentHistory.createdAt).getTime();
  const orderClosed = isClosedCashfreeOrderStatus(orderStatus);

  // Empty payment list on return is common after UPI app-switch — Cashfree can lag.
  // Only treat as abandoned once the order is closed; otherwise keep polling.
  if (fromReturn && payments.length === 0) {
    if (orderClosed) {
      return { state: "abandoned", shouldContinuePolling: false };
    }
    return { state: "waiting", shouldContinuePolling: true };
  }

  if (payments.length === 0 && (ageMs >= STALE_PENDING_PAYMENT_MS || orderClosed)) {
    return { state: "stale", shouldContinuePolling: false };
  }

  return { state: "waiting", shouldContinuePolling: Boolean(fromReturn) };
};

const getWebhookOrderId = (webhookObject = {}) => {
  return (
    webhookObject?.data?.order?.order_id ||
    webhookObject?.data?.payment?.order_id ||
    webhookObject?.order?.order_id ||
    null
  );
};

const getWebhookPaymentDetails = (webhookObject = {}) => {
  const payment = webhookObject?.data?.payment || webhookObject?.payment || {};
  return {
    cfPaymentId:
      payment?.cf_payment_id ||
      payment?.payment_gateway_details?.gateway_payment_id ||
      null,
    paymentMethod: payment?.payment_method || payment?.payment_group || null,
    paymentStatus: payment?.payment_status || null,
    paymentAmount: payment?.payment_amount || payment?.order_amount || null,
  };
};

/**
 * Returns whether registration is allowed and a user-facing reason when blocked.
 */
const checkRegistrationAvailability = async () => {
  const settings = await CommonSettings.getOrCreateSettings();

  if (!settings.registerEnabled) {
    return {
      allowed: false,
      reason: "Registration is currently disabled. Please contact the administrator.",
      code: "REGISTRATION_DISABLED",
    };
  }

  if (!settings.paymentGateway?.enabled) {
    return {
      allowed: false,
      reason:
        "Membership registration is not available yet. Payment gateway is disabled.",
      code: "PAYMENT_GATEWAY_DISABLED",
    };
  }

  const activePlanCount = await getActivePlanCount();
  if (activePlanCount === 0) {
    return {
      allowed: false,
      reason:
        "No membership plans are available. Please contact the administrator.",
      code: "NO_ACTIVE_PLANS",
    };
  }

  return { allowed: true };
};

const isMembershipActive = (user) => {
  if (!user || user.status !== 1) {
    return false;
  }

  if (user.isLifetimePaid) {
    return true;
  }

  if (!user.isPaid) {
    return false;
  }

  if (!user.renewalDate) {
    return false;
  }

  return new Date(user.renewalDate).getTime() > Date.now();
};

const isMembershipExpired = (user) => {
  if (!user || user.isLifetimePaid) {
    return false;
  }

  if (user.status === 2) {
    return true;
  }

  if (user.status === 4 && !user.isPaid) {
    return false;
  }

  if (!user.isPaid) {
    return true;
  }

  if (!user.renewalDate) {
    return false;
  }

  return new Date(user.renewalDate).getTime() <= Date.now();
};

const needsPayment = (user) => {
  return Boolean(user && user.status === 4 && !user.isPaid);
};

const getMembershipAccessState = (user) => {
  if (!user) {
    return {
      allowed: false,
      code: "UNAUTHORIZED",
      message: "Session expired. Please login again.",
      membershipStatus: "unknown",
    };
  }

  if (user.status === 3) {
    return {
      allowed: false,
      code: "ACCOUNT_BLOCKED",
      message: "Account access denied. Please contact support.",
      membershipStatus: "blocked",
    };
  }

  if (needsPayment(user)) {
    return {
      allowed: false,
      code: "PAYMENT_REQUIRED",
      message: "Complete your membership payment to access the portal.",
      membershipStatus: "payment_required",
    };
  }

  if (isMembershipActive(user)) {
    return {
      allowed: true,
      code: "ACTIVE",
      message: "Membership active",
      membershipStatus: "active",
    };
  }

  if (isMembershipExpired(user) || user.status === 2) {
    return {
      allowed: false,
      code: "MEMBERSHIP_EXPIRED",
      message: "Your membership has expired. Please renew to continue.",
      membershipStatus: "expired",
    };
  }

  return {
    allowed: false,
    code: "MEMBERSHIP_INACTIVE",
    message: "Membership is not active. Please renew to continue.",
    membershipStatus: "inactive",
  };
};

const getDaysUntilExpiry = (renewalDate) => {
  if (!renewalDate) {
    return null;
  }

  const diffMs = new Date(renewalDate).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

module.exports = {
  slugifyPlanPart,
  generatePlanSlug,
  formatPublicPlan,
  calculateRenewalDate,
  getActivePlanCount,
  checkRegistrationAvailability,
  isSuccessfulCashfreePayment,
  isFailedCashfreePayment,
  isPendingCashfreePayment,
  parseCashfreePaymentsList,
  buildPaymentVerificationMeta,
  ORDER_EXPIRY_MS,
  STALE_PENDING_PAYMENT_MS,
  isClosedCashfreeOrderStatus,
  isPaidCashfreeOrderStatus,
  isAdminLocalOrderId,
  isCashfreeOrderNotFoundError,
  getWebhookOrderId,
  getWebhookPaymentDetails,
  isMembershipActive,
  isMembershipExpired,
  needsPayment,
  getMembershipAccessState,
  getDaysUntilExpiry,
};
