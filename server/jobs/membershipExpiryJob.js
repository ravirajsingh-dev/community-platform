const User = require("../models/User");
const UserSubscription = require("../models/UserSubscription");
const emailService = require("../services/email");
const { APP_PORTAL_URL } = require("../config/config");
const {
  logMembershipPaymentEvent,
  MEMBERSHIP_EVENT_TYPES,
} = require("../utils/paymentAuditLogger");

const expireMemberships = async () => {
  const now = new Date();

  const expiredUsers = await User.find({
    status: 1,
    isPaid: true,
    isLifetimePaid: false,
    renewalDate: { $ne: null, $lt: now },
  }).select("_id name email memberId");

  if (!expiredUsers.length) {
    return { expiredCount: 0 };
  }

  const userIds = expiredUsers.map((user) => user._id);

  await User.updateMany(
    { _id: { $in: userIds } },
    {
      $set: {
        status: 2,
        isPaid: false,
      },
    },
  );

  await UserSubscription.updateMany(
    {
      userId: { $in: userIds },
      status: "active",
      endDate: { $ne: null, $lt: now },
    },
    {
      $set: { status: "expired" },
    },
  );

  for (const user of expiredUsers) {
    if (user.email) {
      try {
        await emailService.sendMembershipExpiredEmail({
          name: user.name,
          email: user.email,
          memberId: user.memberId,
          portalUrl: APP_PORTAL_URL,
        });
      } catch (error) {
        console.error(
          `[membership-expiry] Failed to email user ${user._id}:`,
          error.message,
        );
      }
    }

    logMembershipPaymentEvent({
      eventType: MEMBERSHIP_EVENT_TYPES.EXPIRED,
      userID: String(user._id),
      details: { memberId: user.memberId },
    });
  }

  return { expiredCount: userIds.length };
};

const runMembershipExpiryJob = async () => {
  const result = await expireMemberships();
  if (result.expiredCount > 0) {
    console.log(
      `[membership-expiry] Deactivated ${result.expiredCount} expired membership(s)`,
    );
  }
  return result;
};

module.exports = {
  expireMemberships,
  runMembershipExpiryJob,
};
