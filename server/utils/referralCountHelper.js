const User = require("../models/User");

/**
 * Count a referred user toward their referrer's referralCount the first time
 * they are Active (status = 1).
 *
 * - Only Active referred users are counted.
 * - Idempotent via referralCounted (never double-counts).
 * - Does not decrement on deactivate / expire — only on delete (see below).
 *
 * @param {import("mongoose").Document|object} user
 * @param {import("mongoose").ClientSession|null} session
 * @returns {Promise<{ counted: boolean, reason?: string }>}
 */
const recordActiveReferralIfNeeded = async (user, session = null) => {
  if (!user?._id) {
    return { counted: false, reason: "missing_user" };
  }

  const status = Number(user.status);
  const referralId =
    typeof user.referralId === "string" ? user.referralId.trim() : "";

  if (status !== 1) {
    return { counted: false, reason: "not_active" };
  }
  if (!referralId) {
    return { counted: false, reason: "no_referral" };
  }
  if (user.referralCounted === true) {
    return { counted: false, reason: "already_counted" };
  }

  const claimFilter = {
    _id: user._id,
    status: 1,
    referralId: { $type: "string", $ne: "" },
    referralCounted: { $ne: true },
  };
  const claimUpdate = { $set: { referralCounted: true } };
  const claimOptions = session
    ? { session, returnDocument: "after" }
    : { returnDocument: "after" };

  const claimed = await User.findOneAndUpdate(
    claimFilter,
    claimUpdate,
    claimOptions,
  );

  if (!claimed) {
    return { counted: false, reason: "already_counted_or_ineligible" };
  }

  const referrerMemberId = String(claimed.referralId).trim();
  await User.updateOne(
    { memberId: referrerMemberId },
    { $inc: { referralCount: 1 } },
    session ? { session } : undefined,
  );

  // Keep in-memory docs in sync when callers pass a mongoose document.
  if (typeof user.set === "function") {
    user.set("referralCounted", true);
  } else {
    user.referralCounted = true;
  }

  return { counted: true };
};

/**
 * When a referred user is deleted, drop them from the referrer's count if
 * they had previously been counted as an Active referral.
 *
 * @param {import("mongoose").Document|object|null} deletedUser
 * @param {import("mongoose").ClientSession|null} session
 * @returns {Promise<{ decremented: boolean, reason?: string }>}
 */
const decrementReferralCountOnDelete = async (
  deletedUser,
  session = null,
) => {
  if (!deletedUser) {
    return { decremented: false, reason: "missing_user" };
  }

  if (deletedUser.referralCounted !== true) {
    return { decremented: false, reason: "not_counted" };
  }

  const referralId =
    typeof deletedUser.referralId === "string"
      ? deletedUser.referralId.trim()
      : "";
  if (!referralId) {
    return { decremented: false, reason: "no_referral" };
  }

  await User.updateOne(
    {
      memberId: referralId,
      referralCount: { $gt: 0 },
    },
    { $inc: { referralCount: -1 } },
    session ? { session } : undefined,
  );

  return { decremented: true };
};

module.exports = {
  recordActiveReferralIfNeeded,
  decrementReferralCountOnDelete,
};
