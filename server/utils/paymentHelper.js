const PaymentHistory = require("../models/PaymentHistory");

/**
 * Extract payment method from Cashfree payment response
 * Cashfree returns payment_method as an object like:
 * { upi: { channel: 'collect', upi_id: 'testsuccess@gocash' } }
 * or { card: { ... } }, { netbanking: { ... } }, etc.
 *
 * @param {Object|String} paymentMethod - Payment method from Cashfree
 * @returns {String} - Normalized payment method (UPI, Netbanking, Card, Wallet, Other)
 */
const extractPaymentMethod = (paymentMethod) => {
  if (!paymentMethod) {
    return "UPI"; // Default
  }

  // If it's already a string, normalize to PaymentHistory.method enum values
  if (typeof paymentMethod === "string") {
    const methodMap = {
      UPI: "UPI",
      NETBANKING: "Netbanking",
      CARD: "Card",
      WALLET: "Wallet",
      OTHER: "Other",
    };
    const upperMethod = paymentMethod.toUpperCase();
    if (methodMap[upperMethod]) {
      return methodMap[upperMethod];
    }
    return "UPI"; // Default fallback
  }

  // If it's an object, extract the method type
  if (typeof paymentMethod === "object" && paymentMethod !== null) {
    // Check for UPI
    if (paymentMethod.upi) {
      return "UPI";
    }
    // Check for Card
    if (paymentMethod.card) {
      return "Card";
    }
    // Check for Netbanking
    if (paymentMethod.netbanking) {
      return "Netbanking";
    }
    // Check for Wallet
    if (paymentMethod.wallet) {
      return "Wallet";
    }
    // Check for other payment methods
    const keys = Object.keys(paymentMethod);
    if (keys.length > 0) {
      // Try to infer from the key name
      const firstKey = keys[0].toLowerCase();
      if (firstKey.includes("upi")) return "UPI";
      if (firstKey.includes("card")) return "Card";
      if (firstKey.includes("netbanking") || firstKey.includes("bank"))
        return "Netbanking";
      if (firstKey.includes("wallet")) return "Wallet";
    }
  }

  // Default fallback
  return "UPI";
};

/**
 * Best-effort terminate of an ACTIVE Cashfree order.
 * Safe to call when finalizing unpaid/failed flows — Cashfree may reject if
 * the order is already PAID/EXPIRED/TERMINATED or has an in-flight success.
 *
 * @param {Object} cashfree - Cashfree SDK instance
 * @param {String} orderId
 * @returns {Promise<{ terminated: boolean, orderStatus?: string, reason?: string }>}
 */
const terminateCashfreeOrder = async (cashfree, orderId) => {
  if (!orderId || !cashfree) {
    return { terminated: false, reason: "missing_args" };
  }

  // Local activations (admin / wallet) never create a Cashfree order.
  const localOrderId = String(orderId);
  if (
    localOrderId.startsWith("ADMIN_") ||
    localOrderId.startsWith("WALLET_")
  ) {
    return { terminated: false, reason: "admin_local_order" };
  }

  if (typeof cashfree.PGTerminateOrder !== "function") {
    return { terminated: false, reason: "unsupported_sdk" };
  }

  try {
    const response = await cashfree.PGTerminateOrder(orderId, {
      order_status: "TERMINATED",
    });
    const orderStatus = response?.data?.order_status;
    return {
      terminated: ["TERMINATED", "TERMINATION_REQUESTED"].includes(
        String(orderStatus || "").toUpperCase(),
      ),
      orderStatus,
    };
  } catch (error) {
    console.warn(
      `Failed to terminate Cashfree order ${orderId}:`,
      error.response?.data || error.message,
    );
    return {
      terminated: false,
      reason: error.message || "terminate_failed",
    };
  }
};

/**
 * Cancel existing pending payments for a user
 * This enforces Rule 1: Only one pending payment per user
 *
 * @param {Object} userId - User ID (MongoDB ObjectId)
 * @param {Object} cashfree - Cashfree SDK instance
 * @param {Object} session - MongoDB session (optional, for transactions)
 * @returns {Promise<Array>} - Array of canceled payment history records
 */
const cancelExistingPendingPayments = async (
  userId,
  cashfree,
  session = null,
) => {
  try {
    const query = { userId, status: "pending" };
    const pendingPayments = session
      ? await PaymentHistory.find(query).session(session)
      : await PaymentHistory.find(query);

    if (!pendingPayments || pendingPayments.length === 0) {
      return [];
    }

    const canceledPayments = [];

    for (const payment of pendingPayments) {
      try {
        if (payment.orderId) {
          await terminateCashfreeOrder(cashfree, payment.orderId);
        }

        payment.status = "failed";
        payment.remarks = payment.remarks
          ? `${payment.remarks} | Cancelled due to new payment initiation`
          : "Cancelled due to new payment initiation";

        if (session) {
          await payment.save({ session });
        } else {
          await payment.save();
        }

        canceledPayments.push(payment);
      } catch (err) {
        console.error(`Error canceling payment ${payment._id}:`, err.message);
      }
    }

    return canceledPayments;
  } catch (err) {
    console.error("Error in cancelExistingPendingPayments:", err);
    throw err;
  }
};

module.exports = {
  extractPaymentMethod,
  terminateCashfreeOrder,
  cancelExistingPendingPayments,
};
