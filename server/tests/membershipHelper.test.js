const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  slugifyPlanPart,
  generatePlanSlug,
  formatPublicPlan,
  calculateRenewalDate,
  isSuccessfulCashfreePayment,
  isFailedCashfreePayment,
  isPendingCashfreePayment,
  buildPaymentVerificationMeta,
  getWebhookOrderId,
  getWebhookPaymentDetails,
  isAdminLocalOrderId,
  isCashfreeOrderNotFoundError,
} = require("../utils/membershipHelper");

describe("membershipHelper", () => {
  it("slugifyPlanPart normalizes plan slug segments", () => {
    assert.equal(slugifyPlanPart("Monthly Plan"), "monthly_plan");
    assert.equal(slugifyPlanPart("  Yearly ₹2100  "), "yearly_2100");
  });

  it("generatePlanSlug builds slug from plan fields", () => {
    assert.equal(
      generatePlanSlug("Monthly Plan", 299, "months", 1),
      "monthly_plan_299_months_1",
    );
    assert.equal(
      generatePlanSlug("Lifetime Access", 5000, "lifetime", null),
      "lifetime_access_5000_lifetime",
    );
  });

  it("formatPublicPlan exposes registration fields only", () => {
    const formatted = formatPublicPlan({
      _id: "plan-1",
      name: "Monthly",
      slug: "monthly_299_months_1",
      price: 299,
      currency: "INR",
      durationType: "months",
      durationValue: 1,
      isActive: true,
      createdBy: "admin-1",
    });

    assert.equal(formatted.name, "Monthly");
    assert.equal(formatted.price, 299);
    assert.equal(formatted.slug, "monthly_299_months_1");
    assert.equal(formatted.isActive, undefined);
    assert.equal(formatted.createdBy, undefined);
  });

  it("calculateRenewalDate adds months for monthly plans", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const renewal = calculateRenewalDate(
      { durationType: "months", durationValue: 1 },
      start,
    );

    assert.equal(renewal.getMonth(), 1);
    assert.equal(renewal.getDate(), 15);
  });

  it("calculateRenewalDate returns null for lifetime plans", () => {
    const renewal = calculateRenewalDate(
      { durationType: "lifetime", durationValue: null },
      new Date(),
    );
    assert.equal(renewal, null);
  });

  it("isSuccessfulCashfreePayment recognizes success statuses", () => {
    assert.equal(isSuccessfulCashfreePayment("SUCCESS"), true);
    assert.equal(isSuccessfulCashfreePayment("failed"), false);
  });

  it("isFailedCashfreePayment recognizes terminal failure statuses", () => {
    assert.equal(isFailedCashfreePayment("FAILED"), true);
    assert.equal(isFailedCashfreePayment("USER_DROPPED"), true);
    assert.equal(isFailedCashfreePayment("SUCCESS"), false);
    assert.equal(isFailedCashfreePayment("PENDING"), false);
  });

  it("isPendingCashfreePayment recognizes in-flight payment statuses", () => {
    assert.equal(isPendingCashfreePayment("PENDING"), true);
    assert.equal(isPendingCashfreePayment("SUCCESS"), false);
  });

  it("buildPaymentVerificationMeta keeps polling empty returns until order closes", () => {
    const paymentHistory = { createdAt: new Date() };
    const waiting = buildPaymentVerificationMeta([], paymentHistory, {
      fromReturn: true,
      orderStatus: "ACTIVE",
    });
    assert.equal(waiting.state, "waiting");
    assert.equal(waiting.shouldContinuePolling, true);

    const abandoned = buildPaymentVerificationMeta([], paymentHistory, {
      fromReturn: true,
      orderStatus: "EXPIRED",
    });
    assert.equal(abandoned.state, "abandoned");
    assert.equal(abandoned.shouldContinuePolling, false);
  });

  it("buildPaymentVerificationMeta keeps polling while gateway payment is processing", () => {
    const paymentHistory = { createdAt: new Date() };
    const meta = buildPaymentVerificationMeta(
      [{ payment_status: "PENDING" }],
      paymentHistory,
      { fromReturn: true },
    );
    assert.equal(meta.state, "processing");
    assert.equal(meta.shouldContinuePolling, true);
  });

  it("buildPaymentVerificationMeta prefers in-flight payment over a prior failed attempt", () => {
    const paymentHistory = { createdAt: new Date() };
    const meta = buildPaymentVerificationMeta(
      [{ payment_status: "FAILED" }, { payment_status: "PENDING" }],
      paymentHistory,
      { fromReturn: true },
    );
    assert.equal(meta.state, "processing");
    assert.equal(meta.shouldContinuePolling, true);
  });

  it("buildPaymentVerificationMeta marks closed Cashfree orders without payments as stale", () => {
    const paymentHistory = { createdAt: new Date() };
    const meta = buildPaymentVerificationMeta([], paymentHistory, {
      fromReturn: false,
      orderStatus: "EXPIRED",
    });
    assert.equal(meta.state, "stale");
    assert.equal(meta.shouldContinuePolling, false);
  });

  it("buildPaymentVerificationMeta treats PAID order without payment rows as success", () => {
    const paymentHistory = { createdAt: new Date() };
    const meta = buildPaymentVerificationMeta([], paymentHistory, {
      orderStatus: "PAID",
    });
    assert.equal(meta.state, "success");
  });

  it("buildPaymentVerificationMeta keeps processing even when order is already expired", () => {
    const paymentHistory = {
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    const meta = buildPaymentVerificationMeta(
      [{ payment_status: "IN_PROGRESS" }],
      paymentHistory,
      { orderStatus: "EXPIRED" },
    );
    assert.equal(meta.state, "processing");
    assert.equal(meta.shouldContinuePolling, true);
  });

  it("getWebhookOrderId extracts order id from payment webhook payload", () => {
    const orderId = getWebhookOrderId({
      data: {
        order: { order_id: "RSF_123" },
        payment: { payment_status: "SUCCESS" },
      },
    });
    assert.equal(orderId, "RSF_123");
  });

  it("getWebhookPaymentDetails extracts payment fields", () => {
    const details = getWebhookPaymentDetails({
      data: {
        payment: {
          cf_payment_id: "cf_1",
          payment_status: "SUCCESS",
          payment_method: { upi: { channel: "collect" } },
        },
      },
    });
    assert.equal(details.cfPaymentId, "cf_1");
    assert.equal(details.paymentStatus, "SUCCESS");
  });

  it("detects admin-local order ids and Cashfree order_not_found errors", () => {
    assert.equal(
      isAdminLocalOrderId("ADMIN_a2ab7655_1783677549323_2a5df127"),
      true,
    );
    assert.equal(
      isAdminLocalOrderId("WALLET_a2ab7655_1783677549323_2a5df127"),
      true,
    );
    assert.equal(isAdminLocalOrderId("RSF_a2ab7655_1783677549323_abc"), false);
    assert.equal(isAdminLocalOrderId(null), false);

    assert.equal(
      isCashfreeOrderNotFoundError({
        response: { status: 404, data: { code: "order_not_found" } },
      }),
      true,
    );
    assert.equal(
      isCashfreeOrderNotFoundError({
        response: { status: 500, data: { code: "internal" } },
      }),
      false,
    );
  });

  it("isMembershipActive validates active membership", () => {
    const {
      isMembershipActive,
      isMembershipExpired,
      needsPayment,
      getMembershipAccessState,
      getDaysUntilExpiry,
    } = require("../utils/membershipHelper");

    const activeUser = {
      status: 1,
      isPaid: true,
      isLifetimePaid: false,
      renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    assert.equal(isMembershipActive(activeUser), true);

    const lifetimeUser = {
      status: 1,
      isPaid: true,
      isLifetimePaid: true,
      renewalDate: null,
    };
    assert.equal(isMembershipActive(lifetimeUser), true);

    const expiredUser = {
      status: 1,
      isPaid: true,
      isLifetimePaid: false,
      renewalDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };
    assert.equal(isMembershipActive(expiredUser), false);
    assert.equal(isMembershipExpired(expiredUser), true);

    const unpaidUser = { status: 4, isPaid: false };
    assert.equal(needsPayment(unpaidUser), true);
    assert.equal(
      getMembershipAccessState(unpaidUser).code,
      "PAYMENT_REQUIRED",
    );

    const days = getDaysUntilExpiry(activeUser.renewalDate);
    assert.equal(typeof days, "number");
    assert.ok(days > 0);

    const unpaidActivation = {
      status: 1,
      isPaid: true,
      isLifetimePaid: false,
      renewalDate: null,
    };
    assert.equal(isMembershipActive(unpaidActivation), false);
    assert.equal(
      getMembershipAccessState(unpaidActivation).code,
      "MEMBERSHIP_INACTIVE",
    );

    const legacyUser = {
      status: 1,
      isPaid: false,
      isLifetimePaid: false,
      membershipPlanId: null,
      subscriptionStartDate: null,
    };
    assert.equal(isMembershipActive(legacyUser), false);
    assert.equal(isMembershipExpired(legacyUser), true);
    assert.equal(getMembershipAccessState(legacyUser).code, "MEMBERSHIP_EXPIRED");
  });
});
