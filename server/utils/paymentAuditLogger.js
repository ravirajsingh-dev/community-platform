const { logSecurityEvent, EVENT_TYPES } = require("./auditLogger");

const logMembershipPaymentEvent = ({
  eventType,
  status = "success",
  userID = null,
  adminID = null,
  req = null,
  details = {},
}) => {
  try {
    logSecurityEvent({
      eventType,
      status,
      userID,
      adminID,
      req,
      details,
    });
  } catch (error) {
    console.error("[membership-payment] Failed to write audit log:", error.message);
  }
};

module.exports = {
  logMembershipPaymentEvent,
  MEMBERSHIP_EVENT_TYPES: {
    ORDER_CREATED: EVENT_TYPES.MEMBERSHIP_ORDER_CREATED,
    WEBHOOK: EVENT_TYPES.MEMBERSHIP_PAYMENT_WEBHOOK,
    ACTIVATED: EVENT_TYPES.MEMBERSHIP_PAYMENT_ACTIVATED,
    FAILED: EVENT_TYPES.MEMBERSHIP_PAYMENT_FAILED,
    SYNC: EVENT_TYPES.MEMBERSHIP_PAYMENT_SYNC,
    ADMIN_OVERRIDE: EVENT_TYPES.MEMBERSHIP_ADMIN_OVERRIDE,
    EXPIRED: EVENT_TYPES.MEMBERSHIP_EXPIRED,
  },
};
