/**
 * Pure helpers for donation referral attribution and commission eligibility.
 * Used by submit/approve flows and Phase 4 checklist tests.
 */

const {
  roundMoney,
  calculateCommission,
  computeRawCommission,
  doesCommissionExceedAmount,
  resolveReferralTargetSettings,
  DONATION_REFERRAL_TARGET_KEY,
} = require("./referralCommissionHelpers");

/**
 * Resolve which referral Member ID to validate/save at donation submit.
 * - referralId key omitted → fallback to logged-in user's referralId
 * - referralId present but empty → explicit clear (no attribution)
 * - referralId present with value → use that snapshot candidate
 */
const resolveDonationReferralCandidate = (body = {}, userReferralId) => {
  if (Object.prototype.hasOwnProperty.call(body, "referralId")) {
    const raw = body.referralId;
    if (raw === undefined || raw === null) {
      return null;
    }
    const trimmed = String(raw).trim();
    return trimmed || null;
  }

  const fallback = userReferralId ? String(userReferralId).trim() : "";
  return fallback || null;
};

const resolveCommissionSkipAfterCalc = (amount, referralSettings) => {
  // Explicit miss from per-target resolve (plan/donation not in settings.targets)
  if (referralSettings?.configured === false) {
    return "not_configured";
  }

  if (doesCommissionExceedAmount(amount, referralSettings)) {
    return "commission_exceeds_amount";
  }

  const commissionAmount = calculateCommission(amount, referralSettings);

  if (commissionAmount < 0.01) {
    return Number(referralSettings.commissionValue) > 0
      ? "commission_too_small"
      : "zero_commission";
  }

  return null;
};

/**
 * Pure skip-reason for donation approve credit (before wallet writes).
 * Returns null when eligible to credit.
 *
 * `referralSettings` should already be resolved for the donation target
 * (enabled + commissionType/Value for donation).
 */
const getDonationCommissionSkipReason = ({
  donationRequest,
  referralSettings,
  existingTx = false,
  referrer = null,
}) => {
  if (!donationRequest?._id) {
    return "missing_input";
  }

  if (!donationRequest.referralId) {
    return "no_referral";
  }

  if (existingTx) {
    return "already_credited";
  }

  if (!referralSettings?.enabled) {
    return "disabled";
  }

  const amountSkip = resolveCommissionSkipAfterCalc(
    donationRequest.amount,
    referralSettings,
  );
  if (amountSkip) {
    return amountSkip;
  }

  if (!referrer) {
    return "referrer_not_found";
  }

  if (
    donationRequest.userId &&
    String(referrer._id) === String(donationRequest.userId)
  ) {
    return "self_referral";
  }

  if (
    donationRequest.phone &&
    referrer.phone &&
    String(referrer.phone) === String(donationRequest.phone)
  ) {
    return "self_referral";
  }

  return null;
};

/**
 * Pure skip-reason for membership Activation referral credit.
 * Keeps first-activation-only rule unchanged.
 *
 * `referralSettings` should already be resolved for the selected plan.
 */
const getActivationCommissionSkipReason = ({
  referredUser,
  paymentHistory,
  referralSettings,
  priorSuccessActivation = false,
  existingTx = false,
  referrer = null,
}) => {
  if (!referredUser?._id || !paymentHistory?._id) {
    return "missing_input";
  }

  if (paymentHistory.paymentType !== "Activation") {
    return "not_activation";
  }

  if (/renewal/i.test(String(paymentHistory?.remarks || ""))) {
    return "renewal";
  }

  if (!referredUser.referralId) {
    return "no_referral";
  }

  if (priorSuccessActivation) {
    return "not_first_activation";
  }

  if (existingTx) {
    return "already_credited";
  }

  if (!referralSettings?.enabled) {
    return "disabled";
  }

  const amountSkip = resolveCommissionSkipAfterCalc(
    paymentHistory.amount,
    referralSettings,
  );
  if (amountSkip) {
    return amountSkip;
  }

  if (!referrer) {
    return "referrer_not_found";
  }

  if (String(referrer._id) === String(referredUser._id)) {
    return "self_referral";
  }

  return null;
};

/**
 * Submit-time referrer validation outcome (format already assumed valid when present).
 */
const validateDonationReferrerAtSubmit = ({
  referralCandidate,
  referrer,
  donorPhone,
}) => {
  if (!referralCandidate) {
    return { ok: true, referralId: null };
  }

  if (!referrer || referrer.status !== 1) {
    return {
      ok: false,
      error: "Referral Member ID was not found or is not active.",
    };
  }

  if (referrer.phone && String(referrer.phone) === String(donorPhone)) {
    return {
      ok: false,
      error: "You cannot use your own Member ID as referral.",
    };
  }

  return { ok: true, referralId: referrer.memberId };
};

module.exports = {
  roundMoney,
  calculateCommission,
  computeRawCommission,
  doesCommissionExceedAmount,
  resolveReferralTargetSettings,
  DONATION_REFERRAL_TARGET_KEY,
  resolveDonationReferralCandidate,
  getDonationCommissionSkipReason,
  getActivationCommissionSkipReason,
  validateDonationReferrerAtSubmit,
};
