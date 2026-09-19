const PaymentHistory = require("../models/PaymentHistory");
const { syncPendingPaymentFromCashfree } = require("../services/membershipPaymentService");
const { STALE_PENDING_PAYMENT_MS } = require("../utils/membershipHelper");
const {
  logMembershipPaymentEvent,
  MEMBERSHIP_EVENT_TYPES,
} = require("../utils/paymentAuditLogger");

const BATCH_SIZE = 50;

const reconcileStalePendingPayments = async () => {
  const cutoff = new Date(Date.now() - STALE_PENDING_PAYMENT_MS);

  const stalePayments = await PaymentHistory.find({
    status: "pending",
    paymentType: "Activation",
    createdAt: { $lt: cutoff },
    // Local activations (admin / wallet) bypass Cashfree — never reconcile those rows.
    orderId: { $not: { $regex: /^(ADMIN_|WALLET_)/ } },
  })
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE);

  if (!stalePayments.length) {
    return { reconciled: 0, activated: 0, failed: 0 };
  }

  let activated = 0;
  let failed = 0;

  for (const payment of stalePayments) {
    const beforeStatus = payment.status;
    const { paymentHistory: updated } = await syncPendingPaymentFromCashfree(
      payment,
      { fromReturn: false },
    );

    if (updated?.status === "success" && beforeStatus !== "success") {
      activated += 1;
      logMembershipPaymentEvent({
        eventType: MEMBERSHIP_EVENT_TYPES.SYNC,
        userID: String(updated.userId || ""),
        details: {
          orderId: updated.orderId,
          source: "reconciliation_job",
        },
      });
    } else if (updated?.status === "failed" && beforeStatus === "pending") {
      failed += 1;
    }
  }

  return { reconciled: stalePayments.length, activated, failed };
};

const runPaymentReconciliationJob = async () => {
  const result = await reconcileStalePendingPayments();
  if (result.reconciled > 0) {
    console.log(
      `[payment-reconcile] Checked ${result.reconciled} stale pending payment(s); ${result.activated} activated, ${result.failed} failed`,
    );
  }
  return result;
};

module.exports = {
  reconcileStalePendingPayments,
  runPaymentReconciliationJob,
};
