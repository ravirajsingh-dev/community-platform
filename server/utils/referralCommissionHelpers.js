/**
 * Shared referral commission helpers: per-target resolve + amount-safe calc.
 * Targets: "donation" | membership plan ObjectId string.
 */

const DONATION_REFERRAL_TARGET_KEY = "donation";

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

/**
 * Resolve commission settings for a specific target (donation or membership plan).
 * Legacy global commissionType/commissionValue applies only when `targets` is empty.
 */
const resolveReferralTargetSettings = (referral = {}, targetKey) => {
  const enabled = referral?.enabled === true;
  const key = targetKey == null ? "" : String(targetKey).trim();
  const targets = Array.isArray(referral?.targets) ? referral.targets : [];

  if (key && targets.length > 0) {
    const match = targets.find((t) => String(t?.targetKey || "") === key);
    if (match) {
      return {
        enabled,
        commissionType:
          match.commissionType === "flat" ? "flat" : "percent",
        commissionValue: Number(match.commissionValue) || 0,
        configured: true,
        legacy: false,
      };
    }

    return {
      enabled,
      commissionType: "percent",
      commissionValue: 0,
      configured: false,
      legacy: false,
    };
  }

  // Legacy single global rate (pre per-target settings)
  if (
    targets.length === 0 &&
    (referral?.commissionType != null || referral?.commissionValue != null)
  ) {
    return {
      enabled,
      commissionType:
        referral.commissionType === "flat" ? "flat" : "percent",
      commissionValue: Number(referral.commissionValue) || 0,
      configured: true,
      legacy: true,
    };
  }

  return {
    enabled,
    commissionType: "percent",
    commissionValue: 0,
    configured: false,
    legacy: false,
  };
};

/**
 * Raw commission before amount-exceed guard.
 */
const computeRawCommission = (amount, referralSettings = {}) => {
  const commissionValue = Number(referralSettings.commissionValue) || 0;
  if (commissionValue <= 0) {
    return 0;
  }

  if (referralSettings.commissionType === "flat") {
    return roundMoney(commissionValue);
  }

  return roundMoney((Number(amount) || 0) * (commissionValue / 100));
};

/**
 * True when configured commission would exceed the paid/donated amount.
 * Example: flat ₹1000 on a ₹999 donation → true (no credit).
 */
const doesCommissionExceedAmount = (amount, referralSettings = {}) => {
  const paid = roundMoney(Number(amount) || 0);
  if (paid < 0.01) {
    return Number(referralSettings.commissionValue) > 0;
  }

  const raw = computeRawCommission(paid, referralSettings);
  return raw > paid;
};

/**
 * Commission to credit. Returns 0 when value is zero/invalid OR exceeds amount.
 */
const calculateCommission = (amount, referralSettings = {}) => {
  const paid = roundMoney(Number(amount) || 0);
  const raw = computeRawCommission(paid, referralSettings);
  if (raw < 0.01) {
    return 0;
  }
  if (raw > paid) {
    return 0;
  }
  return raw;
};

/**
 * Normalize admin-submitted targets into a clean array for persistence.
 * Returns { ok, targets } or { ok: false, errors }.
 */
const normalizeReferralTargetsInput = (targetsInput) => {
  if (targetsInput == null) {
    return { ok: true, targets: null };
  }

  if (!Array.isArray(targetsInput)) {
    return {
      ok: false,
      errors: [
        {
          path: "referral.targets",
          msg: "referral.targets must be an array",
        },
      ],
    };
  }

  const errors = [];
  const seen = new Set();
  const targets = [];

  targetsInput.forEach((raw, index) => {
    const pathPrefix = `referral.targets[${index}]`;
    if (!raw || typeof raw !== "object") {
      errors.push({
        path: pathPrefix,
        msg: "Each target must be an object",
      });
      return;
    }

    let targetType = String(raw.targetType || "")
      .trim()
      .toLowerCase();
    let targetKey = String(raw.targetKey || "").trim();
    let planId = raw.planId ? String(raw.planId).trim() : null;

    if (!targetType && targetKey === DONATION_REFERRAL_TARGET_KEY) {
      targetType = "donation";
    }
    if (!targetType && planId) {
      targetType = "membership";
      targetKey = planId;
    }

    if (!["donation", "membership"].includes(targetType)) {
      errors.push({
        path: `${pathPrefix}.targetType`,
        msg: "targetType must be donation or membership",
      });
      return;
    }

    if (targetType === "donation") {
      targetKey = DONATION_REFERRAL_TARGET_KEY;
      planId = null;
    } else {
      if (!planId && targetKey && targetKey !== DONATION_REFERRAL_TARGET_KEY) {
        planId = targetKey;
      }
      if (!planId) {
        errors.push({
          path: `${pathPrefix}.planId`,
          msg: "Membership target requires planId",
        });
        return;
      }
      targetKey = planId;
    }

    if (seen.has(targetKey)) {
      errors.push({
        path: `${pathPrefix}.targetKey`,
        msg: "Duplicate referral target",
      });
      return;
    }
    seen.add(targetKey);

    const commissionType = String(raw.commissionType || "percent")
      .trim()
      .toLowerCase();
    if (!["percent", "flat"].includes(commissionType)) {
      errors.push({
        path: `${pathPrefix}.commissionType`,
        msg: "commissionType must be percent or flat",
      });
      return;
    }

    const numValue =
      typeof raw.commissionValue === "string"
        ? parseFloat(raw.commissionValue)
        : Number(raw.commissionValue);

    if (
      raw.commissionValue === "" ||
      raw.commissionValue === null ||
      raw.commissionValue === undefined ||
      Number.isNaN(numValue) ||
      !Number.isFinite(numValue) ||
      numValue < 0 ||
      !Number.isInteger(numValue)
    ) {
      errors.push({
        path: `${pathPrefix}.commissionValue`,
        msg: "commissionValue must be a whole number greater than or equal to 0",
      });
      return;
    }

    if (commissionType === "percent" && numValue > 99) {
      errors.push({
        path: `${pathPrefix}.commissionValue`,
        msg: "Percent commission can contain at most 2 digits",
      });
      return;
    }

    if (commissionType === "flat" && numValue > 99999) {
      errors.push({
        path: `${pathPrefix}.commissionValue`,
        msg: "Flat commission can contain at most 5 digits",
      });
      return;
    }

    targets.push({
      targetKey,
      targetType,
      planId: targetType === "membership" ? planId : null,
      commissionType,
      commissionValue: numValue,
    });
  });

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, targets };
};

/**
 * Validate membership flat commission against plan price.
 * Donation flat has no fixed ceiling at save-time (runtime amount check).
 */
const validateTargetsAgainstPlans = async (targets, MembershipPlan) => {
  const errors = [];
  const membershipTargets = targets.filter((t) => t.targetType === "membership");

  if (!membershipTargets.length) {
    return { ok: true, errors: [] };
  }

  const planIds = membershipTargets.map((t) => t.planId);
  const plans = await MembershipPlan.find({ _id: { $in: planIds } }).select(
    "_id name price isActive",
  );
  const planById = new Map(plans.map((p) => [String(p._id), p]));
  const inactiveOrMissing = [];

  membershipTargets.forEach((target) => {
    const plan = planById.get(String(target.planId));
    if (!plan || plan.isActive === false) {
      inactiveOrMissing.push(String(target.planId));
      return;
    }

    if (
      target.commissionType === "flat" &&
      target.commissionValue > Number(plan.price)
    ) {
      errors.push({
        path: "referral.targets",
        msg: `Flat commission for "${plan.name}" (₹${target.commissionValue}) cannot exceed plan price (₹${plan.price}).`,
      });
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    inactiveOrMissingPlanIds: inactiveOrMissing,
  };
};

/**
 * Apply referral payload onto a CommonSettings document.
 * Supports per-target `targets` and legacy global type/value.
 * Returns { ok: true } or { ok: false, errors }.
 */
const applyReferralSettingsUpdate = async ({
  settings,
  referral,
  parseBoolean,
  MembershipPlan,
}) => {
  if (!referral) {
    return { ok: true };
  }

  if (!settings.referral) {
    settings.referral = {
      enabled: false,
      commissionType: "percent",
      commissionValue: 0,
      targets: [],
    };
  }

  if (referral.enabled !== undefined) {
    settings.referral.enabled = parseBoolean(referral.enabled);
  }

  if (Object.prototype.hasOwnProperty.call(referral, "targets")) {
    const normalized = normalizeReferralTargetsInput(referral.targets);
    if (!normalized.ok) {
      return { ok: false, errors: normalized.errors };
    }

    const planCheck = await validateTargetsAgainstPlans(
      normalized.targets,
      MembershipPlan,
    );
    if (!planCheck.ok) {
      return { ok: false, errors: planCheck.errors };
    }

    const skipIds = new Set(planCheck.inactiveOrMissingPlanIds || []);
    settings.referral.targets = normalized.targets.filter(
      (target) =>
        target.targetType !== "membership" ||
        !skipIds.has(String(target.planId)),
    );
    // Clear legacy global rate once per-target config is saved
    settings.referral.commissionType = "percent";
    settings.referral.commissionValue = 0;
    settings.markModified("referral");
    return { ok: true };
  }

  // Legacy path: global commissionType / commissionValue
  if (referral.commissionType !== undefined) {
    const commissionType = String(referral.commissionType)
      .trim()
      .toLowerCase();
    if (!["percent", "flat"].includes(commissionType)) {
      return {
        ok: false,
        errors: [
          {
            path: "referral.commissionType",
            msg: "commissionType must be percent or flat",
          },
        ],
      };
    }
    settings.referral.commissionType = commissionType;
  }

  if (referral.commissionValue !== undefined) {
    const numValue =
      typeof referral.commissionValue === "string"
        ? parseFloat(referral.commissionValue)
        : Number(referral.commissionValue);
    if (
      referral.commissionValue === "" ||
      referral.commissionValue === null ||
      Number.isNaN(numValue) ||
      !Number.isFinite(numValue) ||
      numValue < 0 ||
      !Number.isInteger(numValue)
    ) {
      return {
        ok: false,
        errors: [
          {
            path: "referral.commissionValue",
            msg: "commissionValue must be a whole number greater than or equal to 0",
          },
        ],
      };
    }
    const commissionType =
      settings.referral.commissionType ||
      String(referral.commissionType || "percent")
        .trim()
        .toLowerCase();
    if (commissionType === "percent" && numValue > 99) {
      return {
        ok: false,
        errors: [
          {
            path: "referral.commissionValue",
            msg: "Percent commission can contain at most 2 digits",
          },
        ],
      };
    }
    if (commissionType === "flat" && numValue > 99999) {
      return {
        ok: false,
        errors: [
          {
            path: "referral.commissionValue",
            msg: "Flat commission can contain at most 5 digits",
          },
        ],
      };
    }
    settings.referral.commissionValue = Math.round(numValue * 100) / 100;
  }

  settings.markModified("referral");
  return { ok: true };
};

/**
 * Remove membership referral commission targets for the given plan IDs.
 * Used when a plan is deactivated or deleted.
 */
const removeReferralCommissionTargetsForPlans = async (
  planIds,
  { CommonSettings } = {},
) => {
  const SettingsModel = CommonSettings;
  if (!SettingsModel) {
    throw new Error("CommonSettings model is required");
  }

  const ids = (Array.isArray(planIds) ? planIds : [planIds])
    .filter(Boolean)
    .map((id) => String(id));

  if (!ids.length) {
    return { removed: 0 };
  }

  const settings = await SettingsModel.getOrCreateSettings();
  const targets = Array.isArray(settings.referral?.targets)
    ? settings.referral.targets
    : [];

  if (!targets.length) {
    return { removed: 0 };
  }

  const nextTargets = targets.filter((target) => {
    if (target?.targetType !== "membership") {
      return true;
    }
    const key = String(target.planId || target.targetKey || "");
    return !ids.includes(key);
  });

  const removed = targets.length - nextTargets.length;
  if (removed <= 0) {
    return { removed: 0 };
  }

  settings.referral.targets = nextTargets;
  settings.markModified("referral");
  await settings.save();

  return { removed };
};

module.exports = {
  DONATION_REFERRAL_TARGET_KEY,
  roundMoney,
  resolveReferralTargetSettings,
  computeRawCommission,
  doesCommissionExceedAmount,
  calculateCommission,
  normalizeReferralTargetsInput,
  validateTargetsAgainstPlans,
  applyReferralSettingsUpdate,
  removeReferralCommissionTargetsForPlans,
};
