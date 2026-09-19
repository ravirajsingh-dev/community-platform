const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * Lightweight unit coverage for claim eligibility rules used by
 * recordActiveReferralIfNeeded (without DB).
 */
const isEligibleForReferralCount = (user) => {
  if (!user?._id) return { ok: false, reason: "missing_user" };
  if (Number(user.status) !== 1) return { ok: false, reason: "not_active" };
  const referralId =
    typeof user.referralId === "string" ? user.referralId.trim() : "";
  if (!referralId) return { ok: false, reason: "no_referral" };
  if (user.referralCounted === true) {
    return { ok: false, reason: "already_counted" };
  }
  return { ok: true };
};

test("only Active users with referralId are eligible", () => {
  assert.equal(
    isEligibleForReferralCount({
      _id: "1",
      status: 4,
      referralId: "9876543210-01",
    }).reason,
    "not_active",
  );
  assert.equal(
    isEligibleForReferralCount({
      _id: "1",
      status: 1,
      referralId: "",
    }).reason,
    "no_referral",
  );
  assert.equal(
    isEligibleForReferralCount({
      _id: "1",
      status: 1,
      referralId: "9876543210-01",
      referralCounted: true,
    }).reason,
    "already_counted",
  );
  assert.equal(
    isEligibleForReferralCount({
      _id: "1",
      status: 1,
      referralId: "9876543210-01",
    }).ok,
    true,
  );
});

test("delete only decrements when the user was previously counted", () => {
  const shouldDecrement = (user) => {
    if (!user) return false;
    if (user.referralCounted !== true) return false;
    const referralId =
      typeof user.referralId === "string" ? user.referralId.trim() : "";
    return Boolean(referralId);
  };

  assert.equal(
    shouldDecrement({
      referralCounted: true,
      referralId: "9876543210-01",
    }),
    true,
  );
  assert.equal(
    shouldDecrement({
      referralCounted: false,
      referralId: "9876543210-01",
    }),
    false,
  );
  assert.equal(
    shouldDecrement({
      referralCounted: true,
      referralId: "",
    }),
    false,
  );
});
