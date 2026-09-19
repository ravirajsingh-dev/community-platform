const User = require("../models/User");
const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");
const PaymentHistory = require("../models/PaymentHistory");
const CommonSettings = require("../models/CommonSettings");
const {
  calculateCommission,
  roundMoney,
  getDonationCommissionSkipReason,
  getActivationCommissionSkipReason,
  resolveReferralTargetSettings,
  DONATION_REFERRAL_TARGET_KEY,
} = require("../utils/donationReferralHelpers");

const loadReferralSettings = async (session) => {
  const settingsQuery = CommonSettings.findOne()
    .sort({ createdAt: 1, _id: 1 })
    .select("referral");
  const settings = await settingsQuery.session(session);
  return settings?.referral || {};
};

/**
 * Credit referrer wallet and write ledger row.
 * Idempotency is enforced by unique sparse indexes on paymentHistoryId / donationRequestId.
 */
const creditReferrerWallet = async ({
  referrerMemberId,
  amount,
  paymentHistoryId,
  donationRequestId,
  fromUserId,
  remarks,
  session,
}) => {
  if (!session) {
    throw new Error("Referral wallet credit requires a database transaction");
  }

  if (!referrerMemberId || !(Number(amount) >= 0.01)) {
    return { credited: false, reason: "invalid_credit_input" };
  }

  const referrerQuery = User.findOne({
    memberId: referrerMemberId,
  }).select("_id memberId phone status");
  const referrer = await referrerQuery.session(session);

  if (!referrer) {
    return { credited: false, reason: "referrer_not_found" };
  }

  if (fromUserId && String(referrer._id) === String(fromUserId)) {
    return { credited: false, reason: "self_referral" };
  }

  const walletQuery = Wallet.findOneAndUpdate(
    { userId: referrer._id },
    {
      $inc: { balance: amount },
      $setOnInsert: { userId: referrer._id },
    },
    {
      upsert: true,
      returnDocument: "after",
      session,
    },
  );
  const wallet = await walletQuery;

  const balanceAfter = roundMoney(wallet.balance);

  const tx = new WalletTransaction({
    walletId: wallet._id,
    type: "credit",
    amount,
    balanceAfter,
    source: "referral_commission",
    ...(paymentHistoryId ? { paymentHistoryId } : {}),
    ...(donationRequestId ? { donationRequestId } : {}),
    ...(fromUserId ? { fromUserId } : {}),
    remarks: remarks || "",
  });

  await tx.save({ session });

  return {
    credited: true,
    amount,
    referrerId: referrer._id,
    walletId: wallet._id,
    balanceAfter,
  };
};

/**
 * Credit referrer wallet on the referred user's first Activation payment only.
 * Uses the commission configured for paymentHistory.selectedPlan.
 * Idempotent via unique sparse WalletTransaction.paymentHistoryId.
 */
const creditReferralCommissionIfEligible = async ({
  referredUser,
  paymentHistory,
  session = null,
}) => {
  if (!session) {
    throw new Error("Referral commission credit requires a database transaction");
  }

  const priorSuccess =
    referredUser?._id && paymentHistory?._id
      ? await PaymentHistory.exists({
          userId: referredUser._id,
          paymentType: "Activation",
          status: "success",
          _id: { $ne: paymentHistory._id },
        }).session(session)
      : false;

  const existingTx = paymentHistory?._id
    ? await WalletTransaction.exists({
        paymentHistoryId: paymentHistory._id,
      }).session(session)
    : false;

  const referral = await loadReferralSettings(session);
  const planTargetKey = paymentHistory?.selectedPlan
    ? String(paymentHistory.selectedPlan)
    : "";
  const targetSettings = resolveReferralTargetSettings(
    referral,
    planTargetKey,
  );

  const referrer = referredUser?.referralId
    ? await User.findOne({ memberId: referredUser.referralId })
        .select("_id memberId phone status")
        .session(session)
    : null;

  const skipReason = getActivationCommissionSkipReason({
    referredUser,
    paymentHistory,
    referralSettings: targetSettings,
    priorSuccessActivation: Boolean(priorSuccess),
    existingTx: Boolean(existingTx),
    referrer,
  });

  if (skipReason) {
    return { credited: false, reason: skipReason };
  }

  const commissionAmount = calculateCommission(
    paymentHistory.amount,
    targetSettings,
  );

  return creditReferrerWallet({
    referrerMemberId: referredUser.referralId,
    amount: commissionAmount,
    paymentHistoryId: paymentHistory._id,
    fromUserId: referredUser._id,
    remarks: `Registration commission credited for ${
      referredUser.name || "member"
    } (Member ID: ${referredUser.memberId || referredUser._id}).`,
    session,
  });
};

/**
 * Credit referrer wallet when an admin approves a donation request.
 * Uses the commission configured for the donation target.
 * Idempotent via unique sparse WalletTransaction.donationRequestId.
 * Every approved donation with a snapshot referralId can credit (not first-only).
 */
const creditDonationReferralCommissionIfEligible = async ({
  donationRequest,
  session = null,
}) => {
  if (!session) {
    throw new Error(
      "Donation referral commission credit requires a database transaction",
    );
  }

  const existingTx = donationRequest?._id
    ? await WalletTransaction.exists({
        donationRequestId: donationRequest._id,
      }).session(session)
    : false;

  const referral = await loadReferralSettings(session);
  const targetSettings = resolveReferralTargetSettings(
    referral,
    DONATION_REFERRAL_TARGET_KEY,
  );

  const referrer = donationRequest?.referralId
    ? await User.findOne({ memberId: donationRequest.referralId })
        .select("_id memberId phone status")
        .session(session)
    : null;

  const skipReason = getDonationCommissionSkipReason({
    donationRequest,
    referralSettings: targetSettings,
    existingTx: Boolean(existingTx),
    referrer,
  });

  if (skipReason) {
    return { credited: false, reason: skipReason };
  }

  const commissionAmount = calculateCommission(
    donationRequest.amount,
    targetSettings,
  );

  const donorLabel =
    donationRequest.donorName ||
    donationRequest.email ||
    donationRequest.phone ||
    "donor";
  const donor = donationRequest.userId
    ? await User.findById(donationRequest.userId)
        .select("memberId")
        .session(session)
    : null;
  const donorIdentity = donor?.memberId
    ? `${donorLabel} (Member ID: ${donor.memberId})`
    : `${donorLabel} (Guest donor)`;
  const donationAmount = Number(donationRequest.amount || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  );

  return creditReferrerWallet({
    referrerMemberId: referrer.memberId,
    amount: commissionAmount,
    donationRequestId: donationRequest._id,
    fromUserId: donationRequest.userId || undefined,
    remarks: `Donation commission credited for a donation of ₹${donationAmount} by ${donorIdentity}.`,
    session,
  });
};

module.exports = {
  calculateCommission,
  creditReferrerWallet,
  creditReferralCommissionIfEligible,
  creditDonationReferralCommissionIfEligible,
  resolveReferralTargetSettings,
  roundMoney,
};
