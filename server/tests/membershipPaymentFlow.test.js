const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getMembershipAccessState,
  isMembershipActive,
  isMembershipExpired,
  needsPayment,
  calculateRenewalDate,
} = require("../utils/membershipHelper");

describe("membership payment lifecycle", () => {
  it("models registration state before payment", () => {
    const registered = { status: 4, isPaid: false };
    const access = getMembershipAccessState(registered);

    assert.equal(access.code, "PAYMENT_REQUIRED");
    assert.equal(isMembershipActive(registered), false);
    assert.equal(needsPayment(registered), true);
  });

  it("models active membership after successful payment", () => {
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const active = {
      status: 1,
      isPaid: true,
      isLifetimePaid: false,
      renewalDate,
    };

    assert.equal(getMembershipAccessState(active).code, "ACTIVE");
    assert.equal(isMembershipActive(active), true);
    assert.equal(isMembershipExpired(active), false);
  });

  it("models expired membership after cron deactivation", () => {
    const expired = {
      status: 2,
      isPaid: false,
      isLifetimePaid: false,
      renewalDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };

    assert.equal(getMembershipAccessState(expired).code, "MEMBERSHIP_EXPIRED");
    assert.equal(isMembershipActive(expired), false);
    assert.equal(isMembershipExpired(expired), true);
  });

  it("extends renewal date from plan duration", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const renewal = calculateRenewalDate(
      { durationType: "months", durationValue: 3 },
      start,
    );

    assert.equal(renewal.getMonth(), 3);
    assert.equal(renewal.getDate(), 1);
  });

  it("lifetime plan bypasses expiry checks", () => {
    const lifetime = {
      status: 1,
      isPaid: true,
      isLifetimePaid: true,
      renewalDate: null,
    };

    assert.equal(isMembershipActive(lifetime), true);
    assert.equal(isMembershipExpired(lifetime), false);
    assert.equal(getMembershipAccessState(lifetime).code, "ACTIVE");
  });
});
