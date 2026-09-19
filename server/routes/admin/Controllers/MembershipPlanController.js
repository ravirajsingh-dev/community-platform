const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const MembershipPlan = require("../../../models/MembershipPlan");
const User = require("../../../models/User");
const response = require("../../../config/response");
const { generatePlanSlug } = require("../../../utils/membershipHelper");
const { DURATION_TYPES } = require("../../../models/MembershipPlan");
const CommonSettings = require("../../../models/CommonSettings");
const {
  removeReferralCommissionTargetsForPlans,
} = require("../../../utils/referralCommissionHelpers");

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "true" || value === "on";
  }
  return Boolean(value);
};

const getEffectiveDurationValue = (durationType, durationValue) =>
  durationType === "lifetime" ? null : Number(durationValue);

const checkDurationUniqueness = async (
  durationType,
  durationValue,
  excludeId = null,
) => {
  const query = {
    durationType,
    durationValue: getEffectiveDurationValue(durationType, durationValue),
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await MembershipPlan.findOne(query).select("_id name").lean();
  if (existing) {
    const durationLabel =
      durationType === "lifetime"
        ? "lifetime"
        : `${durationValue} ${durationType}`;
    return {
      error: `A membership plan with duration "${durationLabel}" already exists.`,
    };
  }

  return { ok: true };
};

const validatePlanBody = (body, isUpdate = false) => {
  const errors = [];
  const { name, price, currency, durationType, durationValue } = body;

  if (!isUpdate || name !== undefined) {
    if (!name || !String(name).trim()) {
      errors.push({ path: "name", msg: "Plan name is required." });
    } else if (String(name).trim().length > 100) {
      errors.push({ path: "name", msg: "Plan name must be at most 100 characters." });
    }
  }

  if (!isUpdate || price !== undefined) {
    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      errors.push({ path: "price", msg: "Price must be a number greater than or equal to 0." });
    }
  }

  if (!isUpdate || durationType !== undefined) {
    if (!durationType || !DURATION_TYPES.includes(durationType)) {
      errors.push({
        path: "durationType",
        msg: `durationType must be one of: ${DURATION_TYPES.join(", ")}`,
      });
    }
  }

  const effectiveDurationType =
    durationType !== undefined ? durationType : body._existingDurationType;

  if (
    effectiveDurationType &&
    effectiveDurationType !== "lifetime" &&
    (!isUpdate || durationValue !== undefined)
  ) {
    const parsedDuration = Number(durationValue);
    if (Number.isNaN(parsedDuration) || parsedDuration < 1) {
      errors.push({
        path: "durationValue",
        msg: "durationValue must be at least 1 for non-lifetime plans.",
      });
    }
  }

  if (currency !== undefined && currency !== null && String(currency).trim()) {
    if (String(currency).trim().length !== 3) {
      errors.push({ path: "currency", msg: "Currency must be a 3-letter code." });
    }
  }

  return errors;
};

const getMembershipPlans = async (req, res) => {
  try {
    const {
      limit = 50,
      page = 1,
      orderBy = "price",
      ascending = "asc",
      search = "",
      isActive,
    } = req.query;

    const pageSize = Math.min(parseInt(limit, 10) || 50, 100);
    const skip = pageSize * (Math.max(parseInt(page, 10) || 1, 1) - 1);
    const sortDirection = ascending === "desc" ? -1 : 1;
    const allowedOrderFields = ["price", "name", "createdAt", "durationType"];
    const sortField = allowedOrderFields.includes(orderBy) ? orderBy : "price";

    const query = {};

    if (isActive !== undefined && isActive !== "") {
      query.isActive = parseBoolean(isActive);
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { slug: { $regex: term, $options: "i" } },
      ];
    }

    const [data, totalRecord] = await Promise.all([
      MembershipPlan.find(query)
        .sort({ [sortField]: sortDirection, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      MembershipPlan.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      [
        {
          metadata: [
            {
              totalRecord,
              current_page: Math.max(parseInt(page, 10) || 1, 1),
              per_page: pageSize,
            },
          ],
          data,
        },
      ],
      "Membership plans fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching membership plans:", error);
    return response.errorResponse(res, {}, "Failed to fetch membership plans", 500);
  }
};

const getMembershipPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid plan ID", 400);
    }

    const plan = await MembershipPlan.findById(id).lean();
    if (!plan) {
      return response.errorResponse(res, {}, "Membership plan not found", 404);
    }

    return response.successResponse(res, plan, "Membership plan fetched successfully");
  } catch (error) {
    console.error("Error fetching membership plan:", error);
    return response.errorResponse(res, {}, "Failed to fetch membership plan", 500);
  }
};

const createMembershipPlan = async (req, res) => {
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return response.errorResponse(
        res,
        validationErrors.array(),
        "Validation Error",
        400,
      );
    }

    const bodyErrors = validatePlanBody(req.body, false);
    if (bodyErrors.length > 0) {
      return response.errorResponse(res, bodyErrors, "Validation Error", 400);
    }

    const { name, price, currency, durationType, durationValue, isActive } = req.body;

    const durationCheck = await checkDurationUniqueness(durationType, durationValue);
    if (durationCheck.error) {
      return response.errorResponse(
        res,
        [{ path: "durationType", msg: durationCheck.error }],
        "Validation Error",
        400,
      );
    }

    const effectiveDurationValue = getEffectiveDurationValue(durationType, durationValue);
    const slug = generatePlanSlug(name, price, durationType, effectiveDurationValue);

    if (!slug) {
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "Unable to generate a valid plan slug." }],
        "Validation Error",
        400,
      );
    }

    const plan = new MembershipPlan({
      name: String(name).trim(),
      slug,
      price: Number(price),
      currency: currency ? String(currency).trim().toUpperCase() : "INR",
      durationType,
      durationValue: effectiveDurationValue,
      isActive: isActive !== undefined ? parseBoolean(isActive) : true,
      createdBy: req.admin?.id || req.user?.id,
    });

    await plan.save();

    return response.successResponse(
      res,
      plan,
      "Membership plan created successfully",
    );
  } catch (error) {
    console.error("Error creating membership plan:", error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField === "durationType") {
        return response.errorResponse(
          res,
          [{ path: "durationType", msg: "A plan with this duration already exists." }],
          "Validation Error",
          400,
        );
      }
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "A plan with this slug already exists." }],
        "Validation Error",
        400,
      );
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return response.errorResponse(res, errors, "Validation Error", 400);
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to create membership plan",
      500,
    );
  }
};

const updateMembershipPlan = async (req, res) => {
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return response.errorResponse(
        res,
        validationErrors.array(),
        "Validation Error",
        400,
      );
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid plan ID", 400);
    }

    const plan = await MembershipPlan.findById(id);
    if (!plan) {
      return response.errorResponse(res, {}, "Membership plan not found", 404);
    }

    const bodyErrors = validatePlanBody(
      { ...req.body, _existingDurationType: plan.durationType },
      true,
    );
    if (bodyErrors.length > 0) {
      return response.errorResponse(res, bodyErrors, "Validation Error", 400);
    }

    const { name, price, currency, durationType, durationValue, isActive } = req.body;

    const nextName = name !== undefined ? String(name).trim() : plan.name;
    const nextPrice = price !== undefined ? Number(price) : plan.price;
    const nextDurationType =
      durationType !== undefined ? durationType : plan.durationType;
    const nextDurationValue =
      durationValue !== undefined || durationType === "lifetime"
        ? getEffectiveDurationValue(
            nextDurationType,
            durationValue !== undefined ? durationValue : plan.durationValue,
          )
        : plan.durationValue;

    const durationChanged =
      nextDurationType !== plan.durationType ||
      nextDurationValue !== plan.durationValue;

    if (durationChanged) {
      const durationCheck = await checkDurationUniqueness(
        nextDurationType,
        nextDurationValue,
        id,
      );
      if (durationCheck.error) {
        return response.errorResponse(
          res,
          [{ path: "durationType", msg: durationCheck.error }],
          "Validation Error",
          400,
        );
      }
    }

    const slugFieldsChanged =
      nextName !== plan.name ||
      nextPrice !== plan.price ||
      nextDurationType !== plan.durationType ||
      nextDurationValue !== plan.durationValue;

    if (slugFieldsChanged) {
      const slug = generatePlanSlug(
        nextName,
        nextPrice,
        nextDurationType,
        nextDurationValue,
      );
      if (!slug) {
        return response.errorResponse(
          res,
          [{ path: "slug", msg: "Unable to generate a valid plan slug." }],
          "Validation Error",
          400,
        );
      }
      plan.slug = slug;
    }

    plan.name = nextName;
    plan.price = nextPrice;
    plan.durationType = nextDurationType;
    plan.durationValue = nextDurationValue;

    if (currency !== undefined) {
      plan.currency = String(currency).trim().toUpperCase();
    }
    const wasActive = plan.isActive !== false;
    if (isActive !== undefined) plan.isActive = parseBoolean(isActive);

    await plan.save();

    if (wasActive && plan.isActive === false) {
      await removeReferralCommissionTargetsForPlans(plan._id, {
        CommonSettings,
      });
    }

    return response.successResponse(
      res,
      plan,
      "Membership plan updated successfully",
    );
  } catch (error) {
    console.error("Error updating membership plan:", error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField === "durationType") {
        return response.errorResponse(
          res,
          [{ path: "durationType", msg: "A plan with this duration already exists." }],
          "Validation Error",
          400,
        );
      }
      return response.errorResponse(
        res,
        [{ path: "slug", msg: "A plan with this slug already exists." }],
        "Validation Error",
        400,
      );
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => ({
        path: e.path,
        msg: e.message,
      }));
      return response.errorResponse(res, errors, "Validation Error", 400);
    }

    return response.errorResponse(
      res,
      {},
      error.message || "Failed to update membership plan",
      500,
    );
  }
};

const deleteMembershipPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.errorResponse(res, {}, "Invalid plan ID", 400);
    }

    const plan = await MembershipPlan.findById(id);
    if (!plan) {
      return response.errorResponse(res, {}, "Membership plan not found", 404);
    }

    const usersWithPlan = await User.countDocuments({ membershipPlanId: id });

    if (usersWithPlan > 0) {
      plan.isActive = false;
      await plan.save();
      await removeReferralCommissionTargetsForPlans(plan._id, {
        CommonSettings,
      });

      return response.successResponse(
        res,
        plan,
        "Plan deactivated because active users are linked to it",
      );
    }

    await MembershipPlan.deleteOne({ _id: id });
    await removeReferralCommissionTargetsForPlans(id, { CommonSettings });

    return response.successResponse(
      res,
      {},
      "Membership plan deleted successfully",
    );
  } catch (error) {
    console.error("Error deleting membership plan:", error);
    return response.errorResponse(res, {}, "Failed to delete membership plan", 500);
  }
};

/**
 * @route GET /api/common/membership-plans
 * @desc Get active membership plans for registration
 * @access Public
 */
const getActiveMembershipPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true })
      .sort({ price: 1, createdAt: 1 })
      .select("name slug price currency durationType durationValue")
      .lean();

    return response.successResponse(
      res,
      plans,
      "Membership plans retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching active membership plans:", error);
    return response.errorResponse(res, {}, "Failed to fetch membership plans", 500);
  }
};

module.exports = {
  getMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  getActiveMembershipPlans,
};
