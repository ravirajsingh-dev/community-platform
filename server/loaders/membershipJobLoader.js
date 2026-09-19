const { runMembershipExpiryJob } = require("../jobs/membershipExpiryJob");
const { runPaymentReconciliationJob } = require("../jobs/paymentReconciliationJob");

const MS_PER_TWENTY_MINUTES = 20 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const getMsUntilNextMidnightIST = () => {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const istMidnight = new Date(istNow);
  istMidnight.setUTCHours(0, 0, 0, 0);
  istMidnight.setUTCDate(istMidnight.getUTCDate() + 1);
  const nextMidnightUtc = new Date(istMidnight.getTime() - IST_OFFSET_MS);
  return Math.max(nextMidnightUtc.getTime() - now.getTime(), 0);
};

const scheduleMembershipExpiryJob = () => {
  const scheduleNext = () => {
    const delay = getMsUntilNextMidnightIST();
    setTimeout(async () => {
      try {
        await runMembershipExpiryJob();
      } catch (error) {
        console.error("[membership-expiry] Job failed:", error);
      }
      setInterval(() => {
        runMembershipExpiryJob().catch((error) => {
          console.error("[membership-expiry] Job failed:", error);
        });
      }, MS_PER_DAY);
    }, delay);
  };

  setTimeout(() => {
    runMembershipExpiryJob().catch((error) => {
      console.error("[membership-expiry] Startup job failed:", error);
    });
  }, 30000);

  scheduleNext();
  console.log("✅ Membership expiry job scheduled (daily at midnight IST)");

  setTimeout(() => {
    runPaymentReconciliationJob().catch((error) => {
      console.error("[payment-reconcile] Startup job failed:", error);
    });
  }, 60000);

  setInterval(() => {
    runPaymentReconciliationJob().catch((error) => {
      console.error("[payment-reconcile] Job failed:", error);
    });
  }, MS_PER_TWENTY_MINUTES);

  console.log(
    "✅ Payment reconciliation job scheduled (every 20 minutes; stale after order expiry)",
  );
};

module.exports = { scheduleMembershipExpiryJob };
