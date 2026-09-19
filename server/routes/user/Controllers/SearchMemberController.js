const response = require("../../../config/response");
const mongoose = require("mongoose");
const User = require("../../../models/User");
const UserDetails = require("../../../models/UserDetails");
const { enrichUserDetailsLocation } = require("../../../utils/locationHelper");
const { ensureEducationArray } = require("../../../utils/educationHelper");
const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const Kul = require("../../../models/Kul");
const Khamp = require("../../../models/Khamp");
const SubKhamp = require("../../../models/SubKhamp");
const Gotra = require("../../../models/Gotra");
const { processSearchFilters } = require("../../../utils/searchHelper");
const {
  getUserCommunityId,
  toCommunityIdString,
} = require("../../../utils/communityHelper");

/**
 * GET /api/users/search-members
 * Get members list with pagination, search, and filters (for client side)
 * Supports filtering on both User and UserDetails fields
 * Always scoped to the requesting user's community.
 */
const searchMembers = async (req, res) => {
  try {
    const viewerId = req.user?.id;
    const viewerCommunityId = await getUserCommunityId(viewerId);

    if (!viewerCommunityId) {
      return response.successResponse(
        res,
        [
          {
            metadata: [
              {
                totalRecord: 0,
                current_page: parseInt(req.query?.page || req.body?.page || 1),
                per_page: Math.min(
                  parseInt(req.query?.limit || req.body?.limit || 10),
                  100,
                ),
              },
            ],
            data: [],
          },
        ],
        "Set your community in My Account to search members.",
      );
    }

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

    // Force community scope on User.community OR userDetails.community.
    // Do not rely only on userDetails — many members have community only on User.
    if (query && typeof query === "object") {
      delete query["userDetails.community"];
    }
    filters = (Array.isArray(filters) ? filters : []).filter(
      (f) => f !== "userDetails.community",
    );

    const pageSize = Math.min(parseInt(limit), 100);
    const skip = pageSize * (page - 1);
    const sortOrder = ascending === "desc" ? -1 : 1;

    // Separate User fields from UserDetails fields
    const userFields = ["memberId", "name", "phone", "email"];
    const userDetailsFields = [
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

    // Build match query for User collection
    const userFilters = filters.filter((f) =>
      userFields.some((uf) => f === uf || f === "search"),
    );
    const userQuery = {};
    Object.keys(query).forEach((key) => {
      if (key === "search" || userFields.includes(key)) {
        userQuery[key] = query[key];
      }
    });

    const userMatchQuery = processSearchFilters(userFilters, userQuery);

    const baseMatchQuery = {
      status: 1,
      ...userMatchQuery,
    };

    // Build match query for UserDetails (after lookup) — community handled separately
    const userDetailsFilters = filters.filter((f) =>
      userDetailsFields.includes(f),
    );
    const userDetailsQuery = {};
    userDetailsFields.forEach((field) => {
      if (query[field]) {
        userDetailsQuery[field] = query[field];
      }
    });

    // Process UserDetails filters
    const userDetailsMatchQuery = {};
    if (Object.keys(userDetailsQuery).length > 0) {
      const andFilter = [];
      Object.keys(userDetailsQuery).forEach((key) => {
        const filter = userDetailsQuery[key];
        const { value, type } = filter;
        if (!value || !type) return;

        // Remove "userDetails." prefix for matching
        const fieldName = key.replace("userDetails.", "");

        switch (type) {
          case "id":
            if (mongoose.Types.ObjectId.isValid(value)) {
              andFilter.push({
                [`userDetails.${fieldName}`]: new mongoose.Types.ObjectId(
                  value,
                ),
              });
            }
            break;
          case "String":
            if (fieldName === "fatherName" || fieldName === "motherName") {
              andFilter.push({
                [`userDetails.${fieldName}`]: {
                  $regex: new RegExp(value, "i"),
                },
              });
            } else if (fieldName === "education") {
              // Exact value: matches legacy string OR array containing the value
              andFilter.push({
                "userDetails.education": String(value).trim(),
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

      if (andFilter.length > 0) {
        userDetailsMatchQuery.$and = andFilter;
      }
    }

    // Build aggregation pipeline
    // Order MUST be:
    // 1. $match → status: 1 + user filters (if any)
    // 2. $lookup → userDetails
    // 3. $unwind → userDetails
    // 4. community scope (User.community OR userDetails.community)
    // 5. dynamic $match → other userDetails filters (only if present)
    // 6. $project
    // 7. $facet (with $sort, $skip, $limit inside data facet)
    const pipeline = [
      // Step 1: Match on User collection - ALWAYS include status: 1
      { $match: baseMatchQuery },
      // Step 2: Lookup UserDetails
      {
        $lookup: {
          from: "user_details",
          localField: "_id",
          foreignField: "userId",
          as: "userDetails",
        },
      },
      // Step 3: Unwind UserDetails
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true, // Include users without UserDetails (userDetails will be null)
        },
      },
      // Step 4: Always scope to viewer's community (User or UserDetails; ObjectId or string)
      {
        $match: {
          $expr: {
            $or: [
              {
                $eq: [
                  {
                    $toString: {
                      $ifNull: ["$userDetails.community", ""],
                    },
                  },
                  viewerCommunityId.toString(),
                ],
              },
              {
                $eq: [
                  {
                    $toString: {
                      $ifNull: ["$community", ""],
                    },
                  },
                  viewerCommunityId.toString(),
                ],
              },
            ],
          },
        },
      },
    ];

    // Step 5: Add other UserDetails matches if present
    if (Object.keys(userDetailsMatchQuery).length > 0) {
      pipeline.push({ $match: userDetailsMatchQuery });
    }

    // Step 5 & 6: Add projection and facet with sorting/pagination
    pipeline.push(
      {
        $project: {
          _id: 1,
          memberId: 1,
          name: 1,
          phone: 1,
          email: 1,
          isVerified: 1,
          createdAt: 1,
          updatedAt: 1,
          userDetails: {
            fatherName: "$userDetails.fatherName",
            motherName: "$userDetails.motherName",
            height: "$userDetails.height",
            weight: "$userDetails.weight",
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
      return response.successResponse(res, usersList, "Members List");
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
        "No Members Found",
      );
    }
  } catch (err) {
    console.error("Error searching members:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

/**
 * GET /api/users/member-details/:user_id
 * Get member details by ID (read-only, for viewing other users)
 * @access Private
 */
const getMemberDetailsById = async (req, res) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    // Get user data (exclude sensitive fields)
    const user = await User.findById(userId)
      .select("-password -pwdRef -passwordCopy")
      .lean();

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    // Only return active users
    if (user.status !== 1) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    const viewerCommunityId = await getUserCommunityId(req.user?.id);
    if (!viewerCommunityId) {
      return response.errorResponse(
        res,
        { msg: "Set your community in My Account to view members." },
        "Community required",
        403,
      );
    }

    // Get user details
    const userDetails = await UserDetails.findOne({ userId }).lean();

    const targetCommunityId =
      toCommunityIdString(userDetails?.community) ||
      toCommunityIdString(user.community);

    if (
      !targetCommunityId ||
      targetCommunityId !== viewerCommunityId.toString()
    ) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    // Populate labels for location and master data
    if (userDetails) {
      ensureEducationArray(userDetails);
      await enrichUserDetailsLocation(userDetails);

      // Populate community label
      if (userDetails.community) {
        const community = await Community.findById(userDetails.community)
          .select("name status")
          .lean();
        if (community) {
          userDetails.communityLabel = community.name;
          userDetails.communityStatus = community.status;
        }
      }

      // Populate vansh label
      if (userDetails.vansh) {
        const vansh = await Vansh.findById(userDetails.vansh)
          .select("name status")
          .lean();
        if (vansh) {
          userDetails.vanshLabel = vansh.name;
          userDetails.vanshStatus = vansh.status;
        }
      }

      // Populate kul label
      if (userDetails.kul) {
        const kul = await Kul.findById(userDetails.kul)
          .select("name status")
          .lean();
        if (kul) {
          userDetails.kulLabel = kul.name;
          userDetails.kulStatus = kul.status;
        }
      }

      // Populate khamp label
      if (userDetails.khamp) {
        const khamp = await Khamp.findById(userDetails.khamp)
          .select("name status")
          .lean();
        if (khamp) {
          userDetails.khampLabel = khamp.name;
          userDetails.khampStatus = khamp.status;
        }
      }

      if (userDetails.subKhamp) {
        const subKhamp = await SubKhamp.findById(userDetails.subKhamp)
          .select("name status")
          .lean();
        if (subKhamp) {
          userDetails.subKhampLabel = subKhamp.name;
          userDetails.subKhampStatus = subKhamp.status;
        }
      }

      if (userDetails.gotra) {
        const gotra = await Gotra.findById(userDetails.gotra)
          .select("name status")
          .lean();
        if (gotra) {
          userDetails.gotraLabel = gotra.name;
          userDetails.gotraStatus = gotra.status;
        }
      }
    }

    // Combine user and userDetails
    const userData = {
      ...user,
      userDetails: userDetails || null,
    };

    return response.successResponse(
      res,
      userData,
      "Member details retrieved successfully",
    );
  } catch (err) {
    console.error("Error in getMemberDetailsById:", err);
    if (err.kind === "ObjectId") {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports = {
  searchMembers,
  getMemberDetailsById,
};
