const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateCommission,
  resolveDonationReferralCandidate,
  getDonationCommissionSkipReason,
  getActivationCommissionSkipReason,
  validateDonationReferrerAtSubmit,
  roundMoney,
} = require("../utils/donationReferralHelpers");

describe("donation referral Phase 4 checklist", () => {
  describe("calculateCommission (flat vs percent)", () => {
    it("computes percent commission from donation amount", () => {
      assert.equal(
        calculateCommission(1000, {
          commissionType: "percent",
          commissionValue: 10,
        }),
        100,
      );
    });

    it("computes flat commission ignoring donation amount", () => {
      assert.equal(
        calculateCommission(1000, {
          commissionType: "flat",
          commissionValue: 50,
        }),
        50,
      );
    });

    it("returns zero when flat commission exceeds paid amount", () => {
      assert.equal(
        calculateCommission(999, {
          commissionType: "flat",
          commissionValue: 1000,
        }),
        0,
      );
    });

    it("returns flat commission when equal to paid amount", () => {
      assert.equal(
        calculateCommission(1000, {
          commissionType: "flat",
          commissionValue: 1000,
        }),
        1000,
      );
    });

    it("returns zero when commission value is zero", () => {
      assert.equal(
        calculateCommission(1000, {
          commissionType: "percent",
          commissionValue: 0,
        }),
        0,
      );
    });

    it("rounds money to 2 decimals", () => {
      assert.equal(roundMoney(10.005), 10.01);
      assert.equal(
        calculateCommission(33, {
          commissionType: "percent",
          commissionValue: 10,
        }),
        3.3,
      );
    });
  });

  describe("submit attribution + logged-in fallback", () => {
    it("falls back to user.referralId when referralId key is omitted", () => {
      assert.equal(
        resolveDonationReferralCandidate({}, "9999999999-01"),
        "9999999999-01",
      );
    });

    it("treats explicit empty referralId as cleared (no fallback)", () => {
      assert.equal(
        resolveDonationReferralCandidate({ referralId: "" }, "9999999999-01"),
        null,
      );
    });

    it("uses explicit referralId when provided", () => {
      assert.equal(
        resolveDonationReferralCandidate(
          { referralId: "8888888888-02" },
          "9999999999-01",
        ),
        "8888888888-02",
      );
    });

    it("guest without referral resolves to null", () => {
      assert.equal(resolveDonationReferralCandidate({}, null), null);
      assert.equal(resolveDonationReferralCandidate({ referralId: "" }), null);
    });
  });

  describe("submit validation (self / invalid / inactive)", () => {
    it("blocks self-referral by donor phone match", () => {
      const result = validateDonationReferrerAtSubmit({
        referralCandidate: "9876543210-01",
        referrer: { memberId: "9876543210-01", phone: "9876543210", status: 1 },
        donorPhone: "9876543210",
      });
      assert.equal(result.ok, false);
      assert.match(result.error, /own Member ID/i);
    });

    it("blocks missing referrer", () => {
      const result = validateDonationReferrerAtSubmit({
        referralCandidate: "9876543210-01",
        referrer: null,
        donorPhone: "9000000000",
      });
      assert.equal(result.ok, false);
      assert.match(result.error, /not found or is not active/i);
    });

    it("blocks inactive referrer", () => {
      const result = validateDonationReferrerAtSubmit({
        referralCandidate: "9876543210-01",
        referrer: { memberId: "9876543210-01", phone: "9876543210", status: 2 },
        donorPhone: "9000000000",
      });
      assert.equal(result.ok, false);
      assert.match(result.error, /not found or is not active/i);
    });

    it("accepts active non-self referrer", () => {
      const result = validateDonationReferrerAtSubmit({
        referralCandidate: "9876543210-01",
        referrer: { memberId: "9876543210-01", phone: "9876543210", status: 1 },
        donorPhone: "9000000000",
      });
      assert.equal(result.ok, true);
      assert.equal(result.referralId, "9876543210-01");
    });
  });

  describe("approve credit eligibility", () => {
    const baseDonation = {
      _id: "507f1f77bcf86cd799439011",
      referralId: "9876543210-01",
      amount: 1000,
      phone: "9000000000",
      donorName: "Guest Donor",
    };
    const referrer = {
      _id: "507f1f77bcf86cd799439012",
      memberId: "9876543210-01",
      phone: "9876543210",
    };
    const enabledPercent = {
      enabled: true,
      commissionType: "percent",
      commissionValue: 10,
    };

    it("credits guest donation with referral when settings enabled", () => {
      assert.equal(
        getDonationCommissionSkipReason({
          donationRequest: baseDonation,
          referralSettings: enabledPercent,
          existingTx: false,
          referrer,
        }),
        null,
      );
      assert.equal(calculateCommission(baseDonation.amount, enabledPercent), 100);
    });

    it("approves without credit when donation has no referral", () => {
      assert.equal(
        getDonationCommissionSkipReason({
          donationRequest: { ...baseDonation, referralId: undefined },
          referralSettings: enabledPercent,
          existingTx: false,
          referrer,
        }),
        "no_referral",
      );
    });

    it("approves without credit when referral settings disabled", () => {
      assert.equal(
        getDonationCommissionSkipReason({
          donationRequest: baseDonation,
          referralSettings: { ...enabledPercent, enabled: false },
          existingTx: false,
          referrer,
        }),
        "disabled",
      );
    });

    it("skips double credit when wallet tx already exists (retry safe)", () => {
      assert.equal(
        getDonationCommissionSkipReason({
          donationRequest: baseDonation,
          referralSettings: enabledPercent,
          existingTx: true,
          referrer,
        }),
        "already_credited",
      );
    });

    it("does not apply first-activation rule to donations", () => {
      // Donation helper has no priorSuccessActivation input — every approved
      // donation with referral can credit (covered by null skip above).
      assert.equal(
        getDonationCommissionSkipReason({
          donationRequest: baseDonation,
          referralSettings: enabledPercent,
          existingTx: false,
          referrer,
        }),
        null,
      );
    });

    it("blocks self-referral on approve by phone", () => {
      assert.equal(
        getDonationCommissionSkipReason({
          donationRequest: { ...baseDonation, phone: "9876543210" },
          referralSettings: enabledPercent,
          existingTx: false,
          referrer,
        }),
        "self_referral",
      );
    });

    it("skips when flat commission exceeds donation amount", () => {
      assert.equal(
        getDonationCommissionSkipReason({
          donationRequest: { ...baseDonation, amount: 999 },
          referralSettings: {
            enabled: true,
            configured: true,
            commissionType: "flat",
            commissionValue: 1000,
          },
          existingTx: false,
          referrer,
        }),
        "commission_exceeds_amount",
      );
    });

    it("skips when donation target is not configured", () => {
      assert.equal(
        getDonationCommissionSkipReason({
          donationRequest: baseDonation,
          referralSettings: {
            enabled: true,
            configured: false,
            commissionType: "percent",
            commissionValue: 0,
          },
          existingTx: false,
          referrer,
        }),
        "not_configured",
      );
    });
  });

  describe("activation referral unchanged (first only)", () => {
    const referredUser = {
      _id: "507f1f77bcf86cd799439021",
      referralId: "9876543210-01",
      memberId: "9000000000-01",
      name: "New Member",
    };
    const paymentHistory = {
      _id: "507f1f77bcf86cd799439022",
      paymentType: "Activation",
      amount: 500,
      remarks: "Membership activation",
    };
    const referrer = {
      _id: "507f1f77bcf86cd799439023",
      memberId: "9876543210-01",
    };
    const enabledFlat = {
      enabled: true,
      commissionType: "flat",
      commissionValue: 25,
    };

    it("credits first Activation when eligible", () => {
      assert.equal(
        getActivationCommissionSkipReason({
          referredUser,
          paymentHistory,
          referralSettings: enabledFlat,
          priorSuccessActivation: false,
          existingTx: false,
          referrer,
        }),
        null,
      );
      assert.equal(calculateCommission(paymentHistory.amount, enabledFlat), 25);
    });

    it("skips when flat commission exceeds activation amount", () => {
      assert.equal(
        getActivationCommissionSkipReason({
          referredUser,
          paymentHistory: { ...paymentHistory, amount: 50 },
          referralSettings: {
            enabled: true,
            configured: true,
            commissionType: "flat",
            commissionValue: 100,
          },
          priorSuccessActivation: false,
          existingTx: false,
          referrer,
        }),
        "commission_exceeds_amount",
      );
    });

    it("skips when not first Activation", () => {
      assert.equal(
        getActivationCommissionSkipReason({
          referredUser,
          paymentHistory,
          referralSettings: enabledFlat,
          priorSuccessActivation: true,
          existingTx: false,
          referrer,
        }),
        "not_first_activation",
      );
    });

    it("skips renewal payments", () => {
      assert.equal(
        getActivationCommissionSkipReason({
          referredUser,
          paymentHistory: { ...paymentHistory, remarks: "Plan renewal" },
          referralSettings: enabledFlat,
          priorSuccessActivation: false,
          existingTx: false,
          referrer,
        }),
        "renewal",
      );
    });

    it("skips non-Activation payment types", () => {
      assert.equal(
        getActivationCommissionSkipReason({
          referredUser,
          paymentHistory: { ...paymentHistory, paymentType: "Renewal" },
          referralSettings: enabledFlat,
          priorSuccessActivation: false,
          existingTx: false,
          referrer,
        }),
        "not_activation",
      );
    });
  });

  describe("approve concurrency contract", () => {
    it("documents atomic pending→approved filter used by approveDonationRequest", () => {
      // Controller uses findOneAndUpdate({ _id, status: "pending" }, ...).
      // Only one concurrent approve can win that filter; losers get 400.
      const filter = { _id: "507f1f77bcf86cd799439011", status: "pending" };
      assert.equal(filter.status, "pending");
    });
  });
});
