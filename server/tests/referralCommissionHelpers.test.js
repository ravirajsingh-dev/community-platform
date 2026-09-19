const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveReferralTargetSettings,
  doesCommissionExceedAmount,
  normalizeReferralTargetsInput,
  DONATION_REFERRAL_TARGET_KEY,
} = require("../utils/referralCommissionHelpers");

describe("referralCommissionHelpers per-target", () => {
  const planId = "507f1f77bcf86cd799439011";

  it("resolves donation target from targets array", () => {
    const settings = resolveReferralTargetSettings(
      {
        enabled: true,
        targets: [
          {
            targetKey: DONATION_REFERRAL_TARGET_KEY,
            targetType: "donation",
            commissionType: "flat",
            commissionValue: 100,
          },
          {
            targetKey: planId,
            targetType: "membership",
            planId,
            commissionType: "percent",
            commissionValue: 20,
          },
        ],
      },
      DONATION_REFERRAL_TARGET_KEY,
    );

    assert.equal(settings.enabled, true);
    assert.equal(settings.configured, true);
    assert.equal(settings.commissionType, "flat");
    assert.equal(settings.commissionValue, 100);
  });

  it("resolves membership plan target independently", () => {
    const settings = resolveReferralTargetSettings(
      {
        enabled: true,
        targets: [
          {
            targetKey: DONATION_REFERRAL_TARGET_KEY,
            targetType: "donation",
            commissionType: "flat",
            commissionValue: 1000,
          },
          {
            targetKey: planId,
            targetType: "membership",
            planId,
            commissionType: "percent",
            commissionValue: 20,
          },
        ],
      },
      planId,
    );

    assert.equal(settings.commissionType, "percent");
    assert.equal(settings.commissionValue, 20);
  });

  it("marks missing target as not configured when targets exist", () => {
    const settings = resolveReferralTargetSettings(
      {
        enabled: true,
        targets: [
          {
            targetKey: DONATION_REFERRAL_TARGET_KEY,
            targetType: "donation",
            commissionType: "flat",
            commissionValue: 50,
          },
        ],
      },
      planId,
    );

    assert.equal(settings.configured, false);
    assert.equal(settings.commissionValue, 0);
  });

  it("falls back to legacy global rate when targets empty", () => {
    const settings = resolveReferralTargetSettings(
      {
        enabled: true,
        commissionType: "percent",
        commissionValue: 10,
        targets: [],
      },
      planId,
    );

    assert.equal(settings.legacy, true);
    assert.equal(settings.configured, true);
    assert.equal(settings.commissionValue, 10);
  });

  it("detects flat commission exceeding amount", () => {
    assert.equal(
      doesCommissionExceedAmount(999, {
        commissionType: "flat",
        commissionValue: 1000,
      }),
      true,
    );
    assert.equal(
      doesCommissionExceedAmount(1000, {
        commissionType: "flat",
        commissionValue: 1000,
      }),
      false,
    );
  });

  it("normalizes targets input", () => {
    const result = normalizeReferralTargetsInput([
      {
        targetKey: DONATION_REFERRAL_TARGET_KEY,
        targetType: "donation",
        commissionType: "flat",
        commissionValue: 100,
      },
      {
        planId,
        targetType: "membership",
        commissionType: "percent",
        commissionValue: 15,
      },
    ]);

    assert.equal(result.ok, true);
    assert.equal(result.targets.length, 2);
    assert.equal(result.targets[1].targetKey, planId);
    assert.equal(result.targets[1].planId, planId);
  });
});
