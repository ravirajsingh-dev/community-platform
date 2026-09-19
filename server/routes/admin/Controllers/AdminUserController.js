const response = require("../../../config/response");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const User = require("../../../models/User");
const UserDetails = require("../../../models/UserDetails");
const Session = require("../../../models/Session");
const {
  normalizeIndiaCountryCode,
} = require("../../../utils/locationHelper");
const { processSearchFilters } = require("../../../utils/searchHelper");
const { generateMemberIdFromPhone } = require("../../../utils/helper");
const {
  validateReferralId,
  validateEmail,
  validatePhone,
  toTitleCase,
} = require("../../../utils/inputValidation");
const {
  validateEducationInput,
  ensureEducationArray,
} = require("../../../utils/educationHelper");
const { logSecurityEvent, EVENT_TYPES } = require("../../../utils/auditLogger");
const {
  sanitizeError,
  sanitizeDuplicateKeyError,
  sanitizeValidationErrors,
} = require("../../../utils/errorSanitizer");
const { buildOccupationDetails } = require("../../../utils/occupationHelper");
const { decryptPassword } = require("../../../utils/passwordEncryption");
const {
  recordActiveReferralIfNeeded,
  decrementReferralCountOnDelete,
} = require("../../../utils/referralCountHelper");

const ADMIN_USER_LIST_FIELDS = [
  "memberId",
  "name",
  "phone",
  "email",
  "status",
  "createdAt",
  "isPaid",
  "isLifetimePaid",
  "membershipPlanId",
  "search",
];

const ADMIN_USER_DETAILS_LIST_FIELDS = [
  "userDetails.countryCode",
  "userDetails.stateCode",
  "userDetails.cityId",
  "userDetails.villageId",
  "userDetails.vansh",
  "userDetails.kul",
  "userDetails.khamp",
  "userDetails.subKhamp",
  "userDetails.gotra",
  "userDetails.maritalStatus",
  "userDetails.education",
  "userDetails.bloodGroup",
  "userDetails.fatherName",
  "userDetails.motherName",
];

/**
 * Build post-lookup $match for UserDetails fields (Search Member style).
 */
function buildUserDetailsListMatch(filters, query) {
  const userDetailsFilters = (filters || []).filter((f) =>
    ADMIN_USER_DETAILS_LIST_FIELDS.includes(f),
  );
  if (userDetailsFilters.length === 0) return {};

  const andFilter = [];
  userDetailsFilters.forEach((key) => {
    const filter = query?.[key];
    if (!filter) return;
    const { value, type } = filter;
    if (value == null || value === "" || !type) return;

    const fieldName = key.replace("userDetails.", "");

    switch (type) {
      case "id":
        if (mongoose.Types.ObjectId.isValid(value)) {
          andFilter.push({
            [`userDetails.${fieldName}`]: new mongoose.Types.ObjectId(value),
          });
        }
        break;
      case "String":
        if (fieldName === "fatherName" || fieldName === "motherName") {
          andFilter.push({
            [`userDetails.${fieldName}`]: {
              $regex: new RegExp(String(value).trim(), "i"),
            },
          });
        } else {
          andFilter.push({
            [`userDetails.${fieldName}`]: String(value).trim(),
          });
        }
        break;
      case "string":
        andFilter.push({
          [`userDetails.${fieldName}`]: String(value).trim(),
        });
        break;
      default:
        break;
    }
  });

  return andFilter.length > 0 ? { $and: andFilter } : {};
}

/**
 * Community may live on User.community or userDetails.community.
 */
function buildCommunityListMatch(query) {
  const filter = query?.["userDetails.community"];
  if (!filter?.value || !mongoose.Types.ObjectId.isValid(filter.value)) {
    return null;
  }
  const communityId = new mongoose.Types.ObjectId(filter.value);
  return {
    $or: [
      { community: communityId },
      { "userDetails.community": communityId },
    ],
  };
}

/**
 * GET /admin/users/list
 * Get users list with pagination, search, and filters
 */
const getUsersList = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      orderBy = "createdAt",
      ascending = "desc",
    } = req.query || req.body;

    let filters = [];
    let query = {};

    if (req.query.limit) {
      if (typeof req.query.filters === "string") {
        filters = req.query.filters.split(",");
      } else if (Array.isArray(req.query.filters)) {
        filters = req.query.filters;
      }

      if (typeof req.query.query === "string") {
        try {
          query = JSON.parse(req.query.query);
        } catch (e) {
          query = {};
        }
      } else if (typeof req.query.query === "object") {
        query = req.query.query;
      } else {
        query = {};
      }
    } else {
      if (typeof req.body.filters === "string") {
        filters = req.body.filters.split(",");
      } else if (Array.isArray(req.body.filters)) {
        filters = req.body.filters;
      }

      query = typeof req.body.query === "object" ? req.body.query : {};
    }

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    const userFilters = (filters || []).filter((f) =>
      ADMIN_USER_LIST_FIELDS.includes(f),
    );
    const userQuery = {};
    Object.keys(query || {}).forEach((key) => {
      if (ADMIN_USER_LIST_FIELDS.includes(key)) {
        userQuery[key] = query[key];
      }
    });

    const matchQuery = processSearchFilters(userFilters, userQuery);
    const userDetailsMatchQuery = buildUserDetailsListMatch(filters, query);
    const communityMatch = buildCommunityListMatch(query);

    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "user_details",
          localField: "_id",
          foreignField: "userId",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (Object.keys(userDetailsMatchQuery).length > 0) {
      pipeline.push({ $match: userDetailsMatchQuery });
    }
    if (communityMatch) {
      pipeline.push({ $match: communityMatch });
    }

    pipeline.push(
      {
        $lookup: {
          from: "membership_plans",
          localField: "membershipPlanId",
          foreignField: "_id",
          as: "membershipPlan",
        },
      },
      {
        $unwind: {
          path: "$membershipPlan",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          resolvedCommunityId: {
            $ifNull: ["$userDetails.community", "$community"],
          },
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "resolvedCommunityId",
          foreignField: "_id",
          as: "communityDoc",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $lookup: {
          from: "wallets",
          localField: "_id",
          foreignField: "userId",
          as: "walletDoc",
          pipeline: [{ $project: { balance: 1 } }],
        },
      },
      {
        $lookup: {
          from: "payment_histories",
          let: { uid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$uid"] },
                    { $eq: ["$paymentType", "Activation"] },
                    { $eq: ["$status", "success"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
            { $project: { method: 1 } },
          ],
          as: "activationPayment",
        },
      },
      {
        $project: {
          memberId: 1,
          name: 1,
          phone: 1,
          email: 1,
          status: 1,
          isPaid: 1,
          isVerified: 1,
          isLifetimePaid: 1,
          renewalDate: 1,
          subscriptionStartDate: 1,
          membershipPlanId: 1,
          membershipPlanName: "$membershipPlan.name",
          membershipPlanPrice: "$membershipPlan.price",
          membershipPlanDurationType: "$membershipPlan.durationType",
          // Active-referral count (decrements when a counted referred user is deleted)
          referralCount: { $ifNull: ["$referralCount", 0] },
          communityName: {
            $ifNull: [{ $arrayElemAt: ["$communityDoc.name", 0] }, ""],
          },
          walletBalance: {
            $ifNull: [{ $arrayElemAt: ["$walletDoc.balance", 0] }, 0],
          },
          paymentMethod: {
            $ifNull: [{ $arrayElemAt: ["$activationPayment.method", 0] }, null],
          },
          paymentSource: {
            $let: {
              vars: {
                method: {
                  $arrayElemAt: ["$activationPayment.method", 0],
                },
              },
              in: {
                $cond: [
                  { $eq: [{ $type: "$$method" }, "missing"] },
                  null,
                  {
                    $cond: [
                      { $eq: ["$$method", "Wallet"] },
                      "Wallet",
                      "Online",
                    ],
                  },
                ],
              },
            },
          },
          createdAt: 1,
          updatedAt: 1,
          userDetails: {
            dob: "$userDetails.dob",
            gender: "$userDetails.gender",
            fatherName: "$userDetails.fatherName",
            motherName: "$userDetails.motherName",
            address: "$userDetails.address",
            countryCode: "$userDetails.countryCode",
            stateCode: "$userDetails.stateCode",
            cityId: "$userDetails.cityId",
            villageId: "$userDetails.villageId",
            community: "$userDetails.community",
            vansh: "$userDetails.vansh",
            kul: "$userDetails.kul",
            khamp: "$userDetails.khamp",
            subKhamp: "$userDetails.subKhamp",
            gotra: "$userDetails.gotra",
            maritalStatus: "$userDetails.maritalStatus",
            education: "$userDetails.education",
            occupation: "$userDetails.occupation",
            occupationDetails: "$userDetails.occupationDetails",
            bloodGroup: "$userDetails.bloodGroup",
          },
        },
      },
      {
        $facet: {
          metadata: [
            { $count: "totalRecord" },
            {
              $addFields: {
                current_page: parseInt(page),
                per_page: pageSize,
              },
            },
          ],
          data: [
            { $sort: { [orderBy]: sortOrder } },
            { $skip: skip },
            { $limit: pageSize },
          ],
        },
      },
    );

    const usersList = await User.aggregate(pipeline).collation({
      locale: "en",
      strength: 1,
    });

    const [result] = usersList;

    if (result?.metadata?.length > 0) {
      return response.successResponse(res, usersList, "Users List");
    } else {
      return response.successResponse(
        res,
        [
          {
            metadata: [
              { totalRecord: 0, current_page: page, per_page: pageSize },
            ],
            data: [],
          },
        ],
        "No Users",
      );
    }
  } catch (err) {
    console.error("Error fetching users:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /admin/users/:user_id/referrals
 * Get users directly referred by a selected user.
 */
const getUserReferrals = async (req, res) => {
  try {
    const { user_id: userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(res, {}, "Invalid user ID", 400);
    }

    const pageSize = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const currentPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (currentPage - 1) * pageSize;

    const referrer = await User.findById(userId)
      .select("_id memberId name referralCount")
      .lean();
    if (!referrer) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    // List shows all referred users (any status). Count column uses stored Active count.
    const query = { referralId: referrer.memberId };
    const [data, totalRecord] = await Promise.all([
      User.find(query)
        .select("memberId name status isPaid createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      User.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      {
        referrer: {
          ...referrer,
          referralCount: referrer.referralCount || 0,
        },
        data,
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: totalRecord,
          pages: Math.ceil(totalRecord / pageSize) || 0,
        },
      },
      "Referred users fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching referred users:", error);
    return response.errorResponse(res, {}, "Failed to fetch referred users", 500);
  }
};

/**
 * Slim user_details shape for admin Edit User GET — IDs, profile fields, and labels only.
 * Nested $lookups resolve hierarchy/village names in one aggregation (no N+1 findById chain).
 */
const ADMIN_EDIT_USER_DETAILS_LOOKUP_PIPELINE = [
  {
    $project: {
      dob: 1,
      gender: 1,
      fatherName: 1,
      motherName: 1,
      height: 1,
      weight: 1,
      address: 1,
      countryCode: 1,
      stateCode: 1,
      cityId: 1,
      villageId: 1,
      community: 1,
      vansh: 1,
      kul: 1,
      khamp: 1,
      subKhamp: 1,
      gotra: 1,
      maritalStatus: 1,
      education: 1,
      occupation: 1,
      occupationDetails: 1,
      bloodGroup: 1,
    },
  },
  {
    $lookup: {
      from: "communities",
      localField: "community",
      foreignField: "_id",
      as: "communityDoc",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
  {
    $lookup: {
      from: "vanshes",
      localField: "vansh",
      foreignField: "_id",
      as: "vanshDoc",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
  {
    $lookup: {
      from: "kuls",
      localField: "kul",
      foreignField: "_id",
      as: "kulDoc",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
  {
    $lookup: {
      from: "khamps",
      localField: "khamp",
      foreignField: "_id",
      as: "khampDoc",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
  {
    $lookup: {
      from: "subkhamps",
      localField: "subKhamp",
      foreignField: "_id",
      as: "subKhampDoc",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
  {
    $lookup: {
      from: "gotras",
      localField: "gotra",
      foreignField: "_id",
      as: "gotraDoc",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
  {
    $lookup: {
      from: "villages",
      localField: "villageId",
      foreignField: "_id",
      as: "villageDoc",
      pipeline: [{ $project: { name: 1 } }],
    },
  },
  {
    $addFields: {
      communityLabel: { $arrayElemAt: ["$communityDoc.name", 0] },
      vanshLabel: { $arrayElemAt: ["$vanshDoc.name", 0] },
      kulLabel: { $arrayElemAt: ["$kulDoc.name", 0] },
      khampLabel: { $arrayElemAt: ["$khampDoc.name", 0] },
      subKhampLabel: { $arrayElemAt: ["$subKhampDoc.name", 0] },
      gotraLabel: { $arrayElemAt: ["$gotraDoc.name", 0] },
      villageLabel: { $arrayElemAt: ["$villageDoc.name", 0] },
    },
  },
  {
    $project: {
      communityDoc: 0,
      vanshDoc: 0,
      kulDoc: 0,
      khampDoc: 0,
      subKhampDoc: 0,
      gotraDoc: 0,
      villageDoc: 0,
    },
  },
];

/**
 * Prefill userDetails.community from User.community when missing
 * (registration / wallet often stores community only on User).
 */
function applyUserCommunityFallback(userData) {
  const userCommunityId = userData.community;
  if (!userCommunityId) return;

  if (!userData.userDetails) {
    userData.userDetails = {
      community: userCommunityId,
      communityLabel: userData.communityLabel || "",
    };
    return;
  }

  if (!userData.userDetails.community) {
    userData.userDetails.community = userCommunityId;
  }
  if (!userData.userDetails.communityLabel && userData.communityLabel) {
    userData.userDetails.communityLabel = userData.communityLabel;
  }
}

/**
 * Load slim admin Edit User payload (same shape for GET and PUT responses).
 * Returns null when the user does not exist.
 */
async function fetchAdminEditUserById(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [row] = await User.aggregate([
    { $match: { _id: userObjectId } },
    {
      $project: {
        memberId: 1,
        name: 1,
        phone: 1,
        email: 1,
        status: 1,
        alternatePhone: 1,
        pwdRef: 1,
        isPaid: 1,
        isLifetimePaid: 1,
        renewalDate: 1,
        subscriptionStartDate: 1,
        membershipPlanId: 1,
        referralId: 1,
        community: 1,
      },
    },
    {
      $lookup: {
        from: "membership_plans",
        let: { planId: "$membershipPlanId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$$planId", null] },
                  {
                    $eq: [
                      { $toString: "$_id" },
                      { $toString: "$$planId" },
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: {
              name: 1,
              price: 1,
              durationType: 1,
              durationValue: 1,
            },
          },
        ],
        as: "membershipPlan",
      },
    },
    {
      $lookup: {
        from: "communities",
        localField: "community",
        foreignField: "_id",
        as: "communityDoc",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $lookup: {
        from: "user_details",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [{ $toString: "$userId" }, { $toString: "$$uid" }],
              },
            },
          },
          ...ADMIN_EDIT_USER_DETAILS_LOOKUP_PIPELINE,
        ],
        as: "userDetails",
      },
    },
    {
      $addFields: {
        userDetails: { $arrayElemAt: ["$userDetails", 0] },
        membershipPlan: { $arrayElemAt: ["$membershipPlan", 0] },
        membershipPlanName: {
          $arrayElemAt: ["$membershipPlan.name", 0],
        },
        membershipPlanPrice: {
          $arrayElemAt: ["$membershipPlan.price", 0],
        },
        membershipPlanDurationType: {
          $arrayElemAt: ["$membershipPlan.durationType", 0],
        },
        communityLabel: {
          $arrayElemAt: ["$communityDoc.name", 0],
        },
      },
    },
    {
      $project: {
        communityDoc: 0,
      },
    },
  ]);

  if (!row) return null;

  const userData = { ...row };

  if (userData.pwdRef) {
    userData.passwordCopy = decryptPassword(userData.pwdRef);
  }
  delete userData.pwdRef;

  if (!userData.userDetails) {
    userData.userDetails = null;
  } else {
    ensureEducationArray(userData.userDetails);
  }

  applyUserCommunityFallback(userData);

  return userData;
}

/**
 * GET /admin/users/:userId
 * Get user by ID with UserDetails (slim payload for admin Edit User).
 *
 * passwordCopy policy: pwdRef is decrypted on every GET so admins can view/copy
 * the user's password in Edit User. pwdRef is never included in the API response.
 */
const getUserById = async (req, res) => {
  try {
    const userId = req.params.user_id || req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid resource identifier" },
        "Invalid resource identifier",
        400,
      );
    }

    const userData = await fetchAdminEditUserById(userId);

    if (!userData) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    return response.successResponse(res, userData, "User data");
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }
    console.error("Get user by ID error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

const ADMIN_CREATE_USER_FIELDS = ["name", "phone", "email", "password"];

/**
 * POST /admin/users
 * Create new user with core information only (name, phone, email, password).
 * Additional profile details can be added later via edit user.
 */
const createUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const unknownFields = Object.keys(req.body).filter(
      (key) => !ADMIN_CREATE_USER_FIELDS.includes(key),
    );
    if (unknownFields.length > 0) {
      session.endSession();
      return response.errorResponse(
        res,
        unknownFields.map((field) => ({
          path: field,
          msg: `Field '${field}' is not allowed`,
        })),
        "Validation Error",
        400,
      );
    }

    const { name, phone, email, password } = req.body;
    const userSchemaPaths = User.schema.paths;
    const validationErrors = [];

    if (!name) {
      validationErrors.push({ path: "name", msg: "Name is required" });
    } else {
      const nameStr = String(name).trim();
      if (nameStr.length < userSchemaPaths.name.minlength) {
        validationErrors.push({
          path: "name",
          msg: `Name must be at least ${userSchemaPaths.name.minlength} characters`,
        });
      }
      if (nameStr.length > userSchemaPaths.name.maxlength) {
        validationErrors.push({
          path: "name",
          msg: `Name must be at most ${userSchemaPaths.name.maxlength} characters`,
        });
      }
      if (/<[^>]*>/g.test(nameStr)) {
        validationErrors.push({
          path: "name",
          msg: "Name cannot contain HTML or script tags",
        });
      }
      if (/\$[a-zA-Z]+/.test(nameStr)) {
        validationErrors.push({
          path: "name",
          msg: "Name contains invalid characters",
        });
      }
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      validationErrors.push({
        path: "phone",
        msg: phoneValidation.error,
      });
    }

    if (!password) {
      validationErrors.push({ path: "password", msg: "Password is required" });
    } else {
      const passwordStr = String(password);
      const minPasswordLength = userSchemaPaths.password?.minlength || 6;
      const maxPasswordLength = userSchemaPaths.password?.maxlength || 128;
      if (passwordStr.length < minPasswordLength) {
        validationErrors.push({
          path: "password",
          msg: `Password must be at least ${minPasswordLength} characters`,
        });
      }
      if (passwordStr.length > maxPasswordLength) {
        validationErrors.push({
          path: "password",
          msg: `Password must be at most ${maxPasswordLength} characters`,
        });
      }
    }

    let emailStr;
    if (!email) {
      validationErrors.push({ path: "email", msg: "Email is required" });
    } else {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        validationErrors.push({
          path: "email",
          msg: emailValidation.error,
        });
      } else {
        emailStr = emailValidation.sanitized;
      }
    }

    if (validationErrors.length > 0) {
      session.endSession();
      return response.errorResponse(
        res,
        validationErrors,
        "Validation Error",
        400,
      );
    }

    const phoneStr = phoneValidation.sanitized;

    await session.withTransaction(async () => {
      const existingPhone = await User.findOne({ phone: phoneStr }).session(
        session,
      );
      if (existingPhone) {
        throw new Error("Phone number already registered");
      }

      const existingEmail = await User.findOne({
        email: emailStr,
      }).session(session);
      if (existingEmail) {
        throw new Error("Email already registered");
      }

      const memberId = await generateMemberIdFromPhone(phoneStr, session);
      const existingMemberId = await User.findOne({ memberId }).session(
        session,
      );
      if (existingMemberId) {
        throw new Error("Member ID collision detected. Please try again.");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({
        memberId,
        name: toTitleCase(String(name)),
        phone: phoneStr,
        email: emailStr,
        password: hashedPassword,
        passwordCopy: password,
        status: 4,
        uuid: uuidv4(),
      });

      await user.save({ session });
    });

    session.endSession();
    return response.successResponse(res, {}, "User created successfully");
  } catch (err) {
    session.endSession();
    console.error("Error creating user:", err);

    if (err.message === "Phone number already registered") {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Phone number already registered" }],
        "Validation Error",
        400,
      );
    }

    if (err.message === "Email already registered") {
      return response.errorResponse(
        res,
        [{ path: "email", msg: "Email is already registered" }],
        "Validation Error",
        400,
      );
    }

    if (
      err.message &&
      (err.message.includes("Maximum number of users") ||
        err.message.includes("Member ID collision"))
    ) {
      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "Operation limit reached. Please contact support.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    if (err.code === 11000) {
      const field = err.keyPattern?.email ? "email" : "phone";
      const sanitizedError = sanitizeDuplicateKeyError(err, field);
      return response.errorResponse(
        res,
        [sanitizedError],
        "Validation Error",
        400,
      );
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => ({
        path: error.path,
        msg: sanitizeError(error.message, "validation"),
      }));
      return response.errorResponse(res, errors, "Validation Error", 400);
    }

    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * PUT /admin/users/:userId
 * Update user (admin power - can update all fields).
 *
 * Edit User form sends only profile/location/hierarchy fields per tab.
 * Payment and referral fields below (isPaid, isVerified, renewalDate,
 * isLifetimePaid, referralId) are accepted for other admin flows but are
 * never submitted by the Edit User UI.
 */
const updateUserById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        sanitizeValidationErrors(errors.array()),
        "Validation Error",
        400,
      );
    }

    const userId = req.params.user_id || req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid resource identifier" },
        "Invalid resource identifier",
        400,
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    // Get allowed fields from schema
    const allowedUserFields = Object.keys(User.schema.paths).filter(
      (key) => !["_id", "__v", "createdAt", "updatedAt"].includes(key),
    );
    const allowedUserDetailsFields = Object.keys(
      UserDetails.schema.paths,
    ).filter(
      (key) =>
        !["_id", "__v", "createdAt", "updatedAt", "userId"].includes(key) &&
        !key.includes("."), // exclude nested path names (e.g. occupationDetails.department)
    );
    if (!allowedUserDetailsFields.includes("occupationDetails")) {
      allowedUserDetailsFields.push("occupationDetails");
    }

    // Reject unknown fields
    const unknownFields = [];
    Object.keys(req.body).forEach((key) => {
      if (
        !allowedUserFields.includes(key) &&
        !allowedUserDetailsFields.includes(key) &&
        key !== "txn_password"
      ) {
        unknownFields.push(key);
      }
    });

    if (unknownFields.length > 0) {
      return response.errorResponse(
        res,
        unknownFields.map((field) => ({
          path: field,
          msg: `Field '${field}' is not allowed`,
        })),
        "Validation Error",
        400,
      );
    }

    const {
      name,
      phone,
      email,
      password,
      status,
      isPaid,
      isVerified,
      renewalDate,
      isLifetimePaid,
      membershipPlanId,
      subscriptionStartDate,
      referralId,
      alternatePhone,
      // UserDetails fields
      dob,
      gender,
      fatherName,
      motherName,
      height,
      weight,
      address,
      countryCode,
      stateCode,
      cityId,
      villageId,
      community,
      vansh,
      kul,
      khamp,
      subKhamp,
      gotra,
      maritalStatus,
      education,
      occupation,
      occupationDetails: occupationDetailsRaw,
      bloodGroup,
    } = req.body;

    // Get schema paths for validation
    const userSchemaPaths = User.schema.paths;
    const userDetailsSchemaPaths = UserDetails.schema.paths;
    const validationErrors = [];

    let passwordChanged = false;

    // Update User fields
    const userUpdateFields = {};

    if (name !== undefined) {
      const nameStr = name ? String(name).trim() : "";
      if (nameStr) {
        if (nameStr.length < userSchemaPaths.name.minlength) {
          validationErrors.push({
            path: "name",
            msg: `Name must be at least ${userSchemaPaths.name.minlength} characters`,
          });
        } else if (nameStr.length > userSchemaPaths.name.maxlength) {
          validationErrors.push({
            path: "name",
            msg: `Name must be at most ${userSchemaPaths.name.maxlength} characters`,
          });
        } else {
          if (/<[^>]*>/g.test(nameStr)) {
            validationErrors.push({
              path: "name",
              msg: "Name cannot contain HTML or script tags",
            });
          } else if (/\$[a-zA-Z]+/.test(nameStr)) {
            validationErrors.push({
              path: "name",
              msg: "Name contains invalid characters",
            });
          } else {
            userUpdateFields.name = toTitleCase(nameStr);
          }
        }
      } else if (userSchemaPaths.name.isRequired) {
        validationErrors.push({ path: "name", msg: "Name is required" });
      }
    }

    if (email !== undefined) {
      const emailStr = email ? String(email).trim() : "";
      if (emailStr) {
        const emailValidation = validateEmail(emailStr);
        if (!emailValidation.valid) {
          validationErrors.push({
            path: "email",
            msg: emailValidation.error,
          });
        } else {
          const existingUser = await User.findOne({
            email: emailStr,
            _id: { $ne: userId },
          });
          if (existingUser) {
            validationErrors.push({
              path: "email",
              msg: "Email is already registered",
            });
          } else {
            userUpdateFields.email = emailValidation.sanitized;
          }
        }
      } else if (userSchemaPaths.email.isRequired) {
        validationErrors.push({ path: "email", msg: "Email is required" });
      }
    }

    if (alternatePhone !== undefined) {
      const alternatePhoneStr = alternatePhone
        ? String(alternatePhone).trim()
        : "";
      if (alternatePhoneStr) {
        if (!/^\d+$/.test(alternatePhoneStr)) {
          validationErrors.push({
            path: "alternatePhone",
            msg: "Alternate phone must contain only digits",
          });
        } else if (alternatePhoneStr === user.phone) {
          validationErrors.push({
            path: "alternatePhone",
            msg: "Alternate phone must be different from main phone",
          });
        } else {
          userUpdateFields.alternatePhone = alternatePhoneStr;
        }
      } else {
        userUpdateFields.alternatePhone = null;
      }
    }

    if (status !== undefined) {
      const statusNum = parseInt(status);
      if (!userSchemaPaths.status.enumValues.includes(statusNum)) {
        validationErrors.push({
          path: "status",
          msg: `Status must be one of: ${userSchemaPaths.status.enumValues.join(", ")}`,
        });
      } else {
        userUpdateFields.status = statusNum;
      }
    }
    if (isPaid !== undefined)
      userUpdateFields.isPaid = isPaid === true || isPaid === "true";
    if (isVerified !== undefined)
      userUpdateFields.isVerified =
        isVerified === true || isVerified === "true";
    if (renewalDate !== undefined)
      userUpdateFields.renewalDate = renewalDate ? new Date(renewalDate) : null;
    if (isLifetimePaid !== undefined)
      userUpdateFields.isLifetimePaid =
        isLifetimePaid === true || isLifetimePaid === "true";
    if (membershipPlanId !== undefined) {
      if (!membershipPlanId) {
        userUpdateFields.membershipPlanId = null;
      } else if (!mongoose.Types.ObjectId.isValid(membershipPlanId)) {
        validationErrors.push({
          path: "membershipPlanId",
          msg: "Invalid membership plan ID",
        });
      } else {
        userUpdateFields.membershipPlanId = new mongoose.Types.ObjectId(
          membershipPlanId,
        );
      }
    }
    if (subscriptionStartDate !== undefined) {
      userUpdateFields.subscriptionStartDate = subscriptionStartDate
        ? new Date(subscriptionStartDate)
        : null;
    }
    if (referralId !== undefined) {
      if (referralId) {
        const referralValidation = validateReferralId(referralId);
        if (!referralValidation.valid) {
          validationErrors.push({
            path: "referralId",
            msg: referralValidation.error,
          });
        } else if (referralValidation.sanitized === user.memberId) {
          validationErrors.push({
            path: "referralId",
            msg: "User cannot refer themselves",
          });
        } else {
          const referrer = await User.findOne({
            memberId: referralValidation.sanitized,
          }).select("_id memberId status");
          if (!referrer || referrer.status !== 1) {
            validationErrors.push({
              path: "referralId",
              msg: "Referral Member ID was not found or is not active",
            });
          } else {
            userUpdateFields.referralId = referralValidation.sanitized;
          }
        }
      } else {
        userUpdateFields.referralId = null;
      }
    }

    if (validationErrors.length > 0) {
      return response.errorResponse(
        res,
        validationErrors,
        "Validation Error",
        400,
      );
    }

    // Handle phone change (may require Member ID regeneration)
    if (phone !== undefined && phone !== user.phone) {
      const phoneStr = String(phone).trim();
      if (!phoneStr || phoneStr.length === 0) {
        return response.errorResponse(
          res,
          [{ path: "phone", msg: "Phone number is required" }],
          "Validation Error",
          400,
        );
      }
      if (!/^\d+$/.test(phoneStr)) {
        return response.errorResponse(
          res,
          [{ path: "phone", msg: "Phone number must contain only digits" }],
          "Validation Error",
          400,
        );
      }

      // Check if new phone already exists
      const existingUser = await User.findOne({
        phone: phoneStr,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return response.errorResponse(
          res,
          [{ path: "phone", msg: "Phone number already registered" }],
          "Validation Error",
          400,
        );
      }

      userUpdateFields.phone = phoneStr;
      // Regenerate Member ID based on new phone
      const newMemberId = await generateMemberIdFromPhone(phoneStr);
      userUpdateFields.memberId = newMemberId;
    }

    // Handle password change
    if (password !== undefined && password !== "") {
      const passwordStr = String(password);
      const minPasswordLength = userSchemaPaths.password?.minlength || 6;
      const maxPasswordLength = userSchemaPaths.password?.maxlength || 128;
      if (passwordStr.length < minPasswordLength) {
        validationErrors.push({
          path: "password",
          msg: `Password must be at least ${minPasswordLength} characters`,
        });
      } else if (passwordStr.length > maxPasswordLength) {
        validationErrors.push({
          path: "password",
          msg: `Password must be at most ${maxPasswordLength} characters`,
        });
      } else {
        const salt = await bcrypt.genSalt(10);
        userUpdateFields.password = await bcrypt.hash(password, salt);
        userUpdateFields.passwordCopy = password; // Store plain text copy for admin view (will be encrypted by virtual setter)
        userUpdateFields.passwordChangedAt = new Date();
        passwordChanged = true;
      }
    }

    // Check validation errors after password validation
    if (validationErrors.length > 0) {
      return response.errorResponse(
        res,
        validationErrors,
        "Validation Error",
        400,
      );
    }

    // Update user
    let updatedUser;
    if (Object.keys(userUpdateFields).length > 0) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: userUpdateFields },
        { returnDocument: "after" },
      );
    } else {
      updatedUser = user;
    }

    // If admin set status Active and/or referralId, count once toward referrer.
    if (updatedUser) {
      await recordActiveReferralIfNeeded(updatedUser);
    }

    // Update or create UserDetails
    const userDetailsData = {};
    const userDetailsUnset = {};
    const userDetailsValidationErrors = [];

    if (dob !== undefined) {
      if (dob) {
        const dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
          userDetailsValidationErrors.push({
            path: "dob",
            msg: "Date of birth must be a valid date",
          });
        } else {
          userDetailsData.dob = dobDate;
        }
      } else if (userDetailsSchemaPaths.dob.isRequired) {
        userDetailsValidationErrors.push({
          path: "dob",
          msg: "Date of birth is required",
        });
      }
    }

    if (gender !== undefined) {
      if (gender) {
        if (!userDetailsSchemaPaths.gender.enumValues.includes(gender)) {
          userDetailsValidationErrors.push({
            path: "gender",
            msg: `Gender must be one of: ${userDetailsSchemaPaths.gender.enumValues.join(", ")}`,
          });
        } else {
          userDetailsData.gender = gender;
        }
      } else if (userDetailsSchemaPaths.gender.isRequired) {
        userDetailsValidationErrors.push({
          path: "gender",
          msg: "Gender is required",
        });
      }
    }

    if (fatherName !== undefined) {
      const fatherNameStr = fatherName ? String(fatherName).trim() : "";
      if (fatherNameStr) {
        if (
          fatherNameStr.length < userDetailsSchemaPaths.fatherName.minlength
        ) {
          userDetailsValidationErrors.push({
            path: "fatherName",
            msg: `Father's name must be at least ${userDetailsSchemaPaths.fatherName.minlength} characters`,
          });
        } else if (
          fatherNameStr.length > userDetailsSchemaPaths.fatherName.maxlength
        ) {
          userDetailsValidationErrors.push({
            path: "fatherName",
            msg: `Father's name must be at most ${userDetailsSchemaPaths.fatherName.maxlength} characters`,
          });
        } else {
          userDetailsData.fatherName = fatherNameStr;
        }
      } else if (userDetailsSchemaPaths.fatherName.isRequired) {
        userDetailsValidationErrors.push({
          path: "fatherName",
          msg: "Father's name is required",
        });
      }
    }

    if (motherName !== undefined) {
      const motherNameStr = motherName ? String(motherName).trim() : "";
      if (motherNameStr) {
        const motherNamePath = userDetailsSchemaPaths.motherName;
        if (
          motherNamePath.minlength &&
          motherNameStr.length < motherNamePath.minlength
        ) {
          userDetailsValidationErrors.push({
            path: "motherName",
            msg: `Mother's name must be at least ${motherNamePath.minlength} characters`,
          });
        } else if (
          motherNamePath.maxlength &&
          motherNameStr.length > motherNamePath.maxlength
        ) {
          userDetailsValidationErrors.push({
            path: "motherName",
            msg: `Mother's name must be at most ${motherNamePath.maxlength} characters`,
          });
        } else {
          userDetailsData.motherName = motherNameStr;
        }
      } else if (userDetailsSchemaPaths.motherName.isRequired) {
        userDetailsValidationErrors.push({
          path: "motherName",
          msg: "Mother's name is required",
        });
      }
    }

    if (height !== undefined && height !== "" && height !== null) {
      const heightNum = Number(height);
      if (Number.isNaN(heightNum)) {
        userDetailsValidationErrors.push({
          path: "height",
          msg: "Height must be a valid number",
        });
      } else {
        const heightPath = userDetailsSchemaPaths.height;
        if (heightPath.min !== undefined && heightNum < heightPath.min) {
          userDetailsValidationErrors.push({
            path: "height",
            msg: `Height must be at least ${heightPath.min}`,
          });
        } else if (heightPath.max !== undefined && heightNum > heightPath.max) {
          userDetailsValidationErrors.push({
            path: "height",
            msg: `Height must be at most ${heightPath.max}`,
          });
        } else {
          userDetailsData.height = heightNum;
        }
      }
    }

    if (weight !== undefined && weight !== "" && weight !== null) {
      const weightNum = Number(weight);
      if (Number.isNaN(weightNum)) {
        userDetailsValidationErrors.push({
          path: "weight",
          msg: "Weight must be a valid number",
        });
      } else {
        const weightPath = userDetailsSchemaPaths.weight;
        if (weightPath.min !== undefined && weightNum < weightPath.min) {
          userDetailsValidationErrors.push({
            path: "weight",
            msg: `Weight must be at least ${weightPath.min}`,
          });
        } else if (weightPath.max !== undefined && weightNum > weightPath.max) {
          userDetailsValidationErrors.push({
            path: "weight",
            msg: `Weight must be at most ${weightPath.max}`,
          });
        } else {
          userDetailsData.weight = weightNum;
        }
      }
    }

    if (address !== undefined) {
      const addressStr = address ? String(address).trim() : "";
      if (addressStr) {
        if (addressStr.length < userDetailsSchemaPaths.address.minlength) {
          userDetailsValidationErrors.push({
            path: "address",
            msg: `Address must be at least ${userDetailsSchemaPaths.address.minlength} characters`,
          });
        } else if (
          addressStr.length > userDetailsSchemaPaths.address.maxlength
        ) {
          userDetailsValidationErrors.push({
            path: "address",
            msg: `Address must be at most ${userDetailsSchemaPaths.address.maxlength} characters`,
          });
        } else {
          userDetailsData.address = addressStr;
        }
      } else if (userDetailsSchemaPaths.address.isRequired) {
        userDetailsValidationErrors.push({
          path: "address",
          msg: "Address is required",
        });
      }
    }

    if (
      countryCode !== undefined ||
      stateCode !== undefined ||
      cityId !== undefined ||
      villageId !== undefined
    ) {
      const normalized = normalizeIndiaCountryCode(countryCode, {
        defaultIfEmpty: true,
      });
      if (normalized.errors.length > 0) {
        userDetailsValidationErrors.push(...normalized.errors);
      } else {
        userDetailsData.countryCode = normalized.countryCode;
      }
    }

    if (stateCode !== undefined && stateCode) {
      userDetailsData.stateCode = String(stateCode).trim();
    }

    if (cityId !== undefined && cityId) {
      userDetailsData.cityId = String(cityId).trim();
    }

    if (villageId !== undefined) {
      if (villageId === null || villageId === "") {
        userDetailsUnset.villageId = "";
      } else if (mongoose.Types.ObjectId.isValid(villageId)) {
        userDetailsData.villageId = new mongoose.Types.ObjectId(villageId);
      } else {
        userDetailsValidationErrors.push({
          path: "villageId",
          msg: "Invalid village ID format",
        });
      }
    }

    if (community !== undefined && community) {
      if (mongoose.Types.ObjectId.isValid(community)) {
        userDetailsData.community = new mongoose.Types.ObjectId(community);
      } else {
        userDetailsValidationErrors.push({
          path: "community",
          msg: "Invalid community ID format",
        });
      }
    }

    if (vansh !== undefined && vansh) {
      if (mongoose.Types.ObjectId.isValid(vansh)) {
        userDetailsData.vansh = new mongoose.Types.ObjectId(vansh);
      } else {
        userDetailsValidationErrors.push({
          path: "vansh",
          msg: "Invalid vansh ID format",
        });
      }
    }

    if (kul !== undefined && kul) {
      if (mongoose.Types.ObjectId.isValid(kul)) {
        userDetailsData.kul = new mongoose.Types.ObjectId(kul);
      } else {
        userDetailsValidationErrors.push({
          path: "kul",
          msg: "Invalid kul ID format",
        });
      }
    }

    if (khamp !== undefined && khamp) {
      if (mongoose.Types.ObjectId.isValid(khamp)) {
        userDetailsData.khamp = new mongoose.Types.ObjectId(khamp);
      } else {
        userDetailsValidationErrors.push({
          path: "khamp",
          msg: "Invalid khamp ID format",
        });
      }
    }

    if (subKhamp !== undefined && subKhamp) {
      if (mongoose.Types.ObjectId.isValid(subKhamp)) {
        userDetailsData.subKhamp = new mongoose.Types.ObjectId(subKhamp);
      } else {
        userDetailsValidationErrors.push({
          path: "subKhamp",
          msg: "Invalid sub-khamp ID format",
        });
      }
    }

    if (gotra !== undefined) {
      if (gotra && mongoose.Types.ObjectId.isValid(gotra)) {
        userDetailsData.gotra = new mongoose.Types.ObjectId(gotra);
      } else if (gotra === null || gotra === "") {
        userDetailsValidationErrors.push({
          path: "gotra",
          msg: "Gotra is required",
        });
      } else {
        userDetailsValidationErrors.push({
          path: "gotra",
          msg: "Invalid gotra ID format",
        });
      }
    }

    if (maritalStatus !== undefined) {
      if (maritalStatus) {
        if (
          !userDetailsSchemaPaths.maritalStatus.enumValues.includes(
            maritalStatus,
          )
        ) {
          userDetailsValidationErrors.push({
            path: "maritalStatus",
            msg: `Marital status must be one of: ${userDetailsSchemaPaths.maritalStatus.enumValues.join(", ")}`,
          });
        } else {
          userDetailsData.maritalStatus = maritalStatus;
        }
      } else if (userDetailsSchemaPaths.maritalStatus.isRequired) {
        userDetailsValidationErrors.push({
          path: "maritalStatus",
          msg: "Marital status is required",
        });
      }
    }

    if (education !== undefined) {
      const educationResult = validateEducationInput(education);
      if (!educationResult.ok) {
        userDetailsValidationErrors.push(...educationResult.errors);
      } else {
        userDetailsData.education = educationResult.value;
      }
    }

    if (occupation !== undefined) {
      const occupationStr = occupation ? String(occupation).trim() : "";
      if (
        occupationStr &&
        occupationStr.length > userDetailsSchemaPaths.occupation.maxlength
      ) {
        userDetailsValidationErrors.push({
          path: "occupation",
          msg: `Occupation must be at most ${userDetailsSchemaPaths.occupation.maxlength} characters`,
        });
      } else {
        userDetailsData.occupation = occupationStr || undefined;
      }
    }

    if (occupationDetailsRaw !== undefined) {
      const occupationTrimmed = req.body.occupation
        ? String(req.body.occupation).trim()
        : undefined;
      const built = buildOccupationDetails(
        occupationTrimmed,
        occupationDetailsRaw,
      );
      userDetailsData.occupationDetails = built;
    }

    if (bloodGroup !== undefined && bloodGroup) {
      if (!userDetailsSchemaPaths.bloodGroup.enumValues.includes(bloodGroup)) {
        userDetailsValidationErrors.push({
          path: "bloodGroup",
          msg: `Blood group must be one of: ${userDetailsSchemaPaths.bloodGroup.enumValues.join(", ")}`,
        });
      } else {
        userDetailsData.bloodGroup = bloodGroup;
      }
    }

    if (userDetailsValidationErrors.length > 0) {
      return response.errorResponse(
        res,
        userDetailsValidationErrors,
        "Validation Error",
        400,
      );
    }

    if (
      Object.keys(userDetailsData).length > 0 ||
      Object.keys(userDetailsUnset).length > 0
    ) {
      const updateOp = {};
      if (Object.keys(userDetailsData).length > 0) {
        updateOp.$set = userDetailsData;
      }
      if (Object.keys(userDetailsUnset).length > 0) {
        updateOp.$unset = userDetailsUnset;
      }
      await UserDetails.findOneAndUpdate(
        { userId },
        updateOp,
        { returnDocument: "after", upsert: true, runValidators: true },
      );

      // Keep User.community in sync (registration / search scope rely on it)
      if (userDetailsData.community) {
        await User.findByIdAndUpdate(userId, {
          $set: { community: userDetailsData.community },
        });
      }
    }

    // Invalidate all sessions if password was changed
    if (passwordChanged) {
      await Session.deleteMany({ userID: userId });
    }

    const userData = await fetchAdminEditUserById(userId);
    return response.successResponse(res, userData, "User updated successfully");
  } catch (err) {
    console.error("Error updating user:", err);

    if (err.message && err.message.includes("Maximum number of users")) {
      console.error("Update user error details:", err);
      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "Operation limit reached. Please contact support.",
          },
        ],
        "Validation Error",
        400,
      );
    }

    if (err.code === 11000) {
      const sanitizedError = sanitizeDuplicateKeyError(err, "phone");
      return response.errorResponse(
        res,
        [sanitizedError],
        "Validation Error",
        400,
      );
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => ({
        path: error.path,
        msg: sanitizeError(error.message, "validation"),
      }));
      return response.errorResponse(res, errors, "Validation Error", 400);
    }

    console.error("Update user error:", err);
    const errorMessage = sanitizeError(err, "generic");
    return response.errorResponse(
      res,
      [{ msg: errorMessage }],
      errorMessage,
      400,
    );
  }
};

/**
 * DELETE /admin/users/:userId
 * Delete user and associated UserDetails
 */
const deleteUserById = async (req, res) => {
  try {
    const userId = req.params.user_id || req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid resource identifier" },
        "Invalid resource identifier",
        400,
      );
    }

    // Delete UserDetails first (to avoid constraint issues)
    await UserDetails.deleteOne({ userId });

    // Delete all user sessions
    await Session.deleteMany({ userID: userId });

    // Delete User — if they were counted as an Active referral, drop referrer count.
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    await decrementReferralCountOnDelete(deletedUser);

    return response.successResponse(res, {}, "User deleted successfully");
  } catch (err) {
    console.error("Error deleting user:", err);

    if (err.kind === "ObjectId" || err.message === "User not found") {
      return response.errorResponse(
        res,
        { msg: "Resource not found" },
        "Resource not found",
        404,
      );
    }

    console.error("Delete user error:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  getUsersList,
  getUserReferrals,
  getUserById,
  createUser,
  updateUserById,
  deleteUserById,
};
