const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const User = require("../../../models/User");
const UserDetails = require("../../../models/UserDetails");
const {
  enrichUserDetailsLocation,
  normalizeIndiaCountryCode,
  INDIA_ISO2,
} = require("../../../utils/locationHelper");
const Community = require("../../../models/Community");
const Vansh = require("../../../models/Vansh");
const Kul = require("../../../models/Kul");
const Khamp = require("../../../models/Khamp");
const SubKhamp = require("../../../models/SubKhamp");
const Gotra = require("../../../models/Gotra");
const mongoose = require("mongoose");
const { buildOccupationDetails } = require("../../../utils/occupationHelper");
const { toTitleCase } = require("../../../utils/inputValidation");
const {
  validateEducationInput,
  ensureEducationArray,
} = require("../../../utils/educationHelper");
const {
  getProfileRequirementsResponse,
} = require("../../../config/profileRequirements");

/**
 * GET /api/user/profile
 * Get complete user profile (User + UserDetails)
 * @access Private
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
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

    // Get user details
    let userDetails = await UserDetails.findOne({ userId }).lean();

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
      } else if (user.community) {
        const community = await Community.findById(user.community)
          .select("name status")
          .lean();
        userDetails.community = user.community;
        userDetails.communityLabel = community?.name || "";
        userDetails.communityStatus = community?.status || "active";
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

      // Populate gotra label (leaf under Sub-Khamp)
      if (userDetails.gotra) {
        const gotra = await Gotra.findById(userDetails.gotra)
          .select("name status")
          .lean();
        if (gotra) {
          userDetails.gotraLabel = gotra.name;
          userDetails.gotraStatus = gotra.status;
        }
      }
    } else if (user.community) {
      // Prefill community chosen at registration / wallet create
      const community = await Community.findById(user.community)
        .select("name status")
        .lean();
      userDetails = {
        community: user.community,
        communityLabel: community?.name || "",
        communityStatus: community?.status || "active",
      };
    }

    // Always expose community name at profile root for locked filters
    let communityLabel = userDetails?.communityLabel || null;
    let communityStatus = userDetails?.communityStatus || null;
    if (!communityLabel && user.community) {
      const community = await Community.findById(user.community)
        .select("name status")
        .lean();
      communityLabel = community?.name || null;
      communityStatus = community?.status || null;
      if (userDetails && !userDetails.communityLabel) {
        userDetails.communityLabel = communityLabel || "";
        userDetails.communityStatus = communityStatus || "active";
      }
    }

    // Combine user and userDetails
    const profileData = {
      ...user,
      communityLabel,
      communityStatus,
      userDetails: userDetails || null,
    };

    return response.successResponse(
      res,
      profileData,
      "Profile retrieved successfully",
    );
  } catch (err) {
    console.error("Error in getProfile:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * PUT /api/user/profile
 * Update user profile (User + UserDetails)
 * CRITICAL: Member ID and Phone are IMMUTABLE
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Map express-validator errors to consistent format with path and msg
      const formattedErrors = errors.array().map((error) => ({
        path: error.path || error.param || "unknown",
        msg: error.msg || error.message || "Validation failed",
      }));
      return response.errorResponse(
        res,
        formattedErrors,
        "Validation Error",
        400,
      );
    }

    const userId = req.user.id;

    if (!userId) {
      return response.errorResponse(
        res,
        { msg: "Invalid user ID" },
        "Invalid user ID",
        400,
      );
    }

    // CRITICAL: Remove memberId and phone from request body if present
    // These fields are PERMANENT and must never change
    const { memberId, phone, ...updateData } = req.body;

    // If memberId or phone are in the request, reject the update
    if (memberId !== undefined || phone !== undefined) {
      return response.errorResponse(
        res,
        [
          { path: "memberId", msg: "Member ID cannot be changed" },
          { path: "phone", msg: "Phone number cannot be changed" },
        ],
        "Invalid Update Request",
        400,
      );
    }

    // Get current user to verify existence
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    // Start transaction for atomic updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Separate User fields from UserDetails fields based on schema
      const userFields = {};
      const userDetailsFields = {};

      // Get schema paths for validation
      const userSchemaPaths = User.schema.paths;
      const userDetailsSchemaPaths = UserDetails.schema.paths;

      // Get allowed fields from schema
      const allowedUserFields = ["name", "email", "alternatePhone"];

      const allowedUserDetailsFieldsFromSchema = Object.keys(
        userDetailsSchemaPaths,
      ).filter(
        (key) =>
          !["_id", "__v", "createdAt", "updatedAt", "userId"].includes(key),
      );

      // UserDetails model fields (schema-defined; occupationDetails always allowed for subdocument)
      const baseUserDetailsFields = [
        "dob",
        "gender",
        "fatherName",
        "motherName",
        "height",
        "weight",
        "address",
        "countryCode",
        "stateCode",
        "cityId",
        "villageId",
        "community",
        "vansh",
        "kul",
        "khamp",
        "subKhamp",
        "gotra",
        "maritalStatus",
        "education",
        "occupation",
        "occupationDetails",
        "bloodGroup",
      ];
      const allowedUserDetailsFields = baseUserDetailsFields.filter(
        (field) =>
          allowedUserDetailsFieldsFromSchema.includes(field) ||
          field === "occupationDetails",
      );

      // Validate and separate fields - reject unknown fields
      const validationErrors = [];
      Object.keys(updateData).forEach((key) => {
        if (
          !allowedUserFields.includes(key) &&
          !allowedUserDetailsFields.includes(key)
        ) {
          validationErrors.push({
            path: key,
            msg: `Field '${key}' is not allowed`,
          });
        }
      });

      if (validationErrors.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return response.errorResponse(
          res,
          validationErrors,
          "Validation Error",
          400,
        );
      }

      // Validate and collect User fields
      Object.keys(updateData).forEach((key) => {
        if (allowedUserFields.includes(key)) {
          userFields[key] = updateData[key];
        } else if (allowedUserDetailsFields.includes(key)) {
          userDetailsFields[key] = updateData[key];
        }
      });

      // Validate name if provided
      if (userFields.name !== undefined) {
        const nameStr = userFields.name ? String(userFields.name).trim() : "";
        if (nameStr) {
          const namePath = userSchemaPaths.name;
          if (namePath.minlength && nameStr.length < namePath.minlength) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "name",
                  msg: `Name must be at least ${namePath.minlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (namePath.maxlength && nameStr.length > namePath.maxlength) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "name",
                  msg: `Name must be at most ${namePath.maxlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (/<[^>]*>/g.test(nameStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "name",
                  msg: "Name cannot contain HTML or script tags",
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (/\$[a-zA-Z]+/.test(nameStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "name", msg: "Name contains invalid characters" }],
              "Validation Error",
              400,
            );
          }
          userFields.name = toTitleCase(nameStr);
        } else if (userSchemaPaths.name.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "name", msg: "Name is required" }],
            "Validation Error",
            400,
          );
        }
      }

      // Validate alternatePhone if provided
      if (userFields.alternatePhone !== undefined) {
        const alternatePhoneStr = userFields.alternatePhone
          ? String(userFields.alternatePhone).trim()
          : "";
        if (alternatePhoneStr) {
          const altPhonePath = userSchemaPaths.alternatePhone;
          if (
            altPhonePath.minlength &&
            alternatePhoneStr.length < altPhonePath.minlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "alternatePhone",
                  msg: `Alternate phone must be at least ${altPhonePath.minlength} digits`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (
            altPhonePath.maxlength &&
            alternatePhoneStr.length > altPhonePath.maxlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "alternatePhone",
                  msg: `Alternate phone must be at most ${altPhonePath.maxlength} digits`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (!/^\d{10}$/.test(alternatePhoneStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "alternatePhone",
                  msg: "Alternate phone must contain only digits",
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (alternatePhoneStr === currentUser.phone) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "alternatePhone",
                  msg: "Alternate phone must be different from main phone",
                },
              ],
              "Validation Error",
              400,
            );
          }
          userFields.alternatePhone = alternatePhoneStr;
        } else {
          userFields.alternatePhone = null;
        }
      }

      // Validate email if provided
      if (userFields.email !== undefined) {
        const emailStr = userFields.email
          ? String(userFields.email).trim()
          : "";
        if (emailStr) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailStr)) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "email", msg: "Invalid email format" }],
              "Validation Error",
              400,
            );
          }
          const existingUser = await User.findOne({
            email: emailStr,
            _id: { $ne: userId },
          }).session(session);
          if (existingUser) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "email", msg: "Email is already registered" }],
              "Validation Error",
              400,
            );
          }
          userFields.email = emailStr;
        } else if (userSchemaPaths.email.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "email", msg: "Email is required" }],
            "Validation Error",
            400,
          );
        }
      }

      // Validate UserDetails fields
      if (userDetailsFields.dob !== undefined) {
        if (userDetailsFields.dob) {
          const dobDate = new Date(userDetailsFields.dob);
          if (isNaN(dobDate.getTime())) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "dob", msg: "Date of birth must be a valid date" }],
              "Validation Error",
              400,
            );
          }
          userDetailsFields.dob = dobDate;
        } else if (userDetailsSchemaPaths.dob.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "dob", msg: "Date of birth is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (userDetailsFields.gender !== undefined) {
        const genderPath = userDetailsSchemaPaths.gender;
        if (userDetailsFields.gender) {
          if (
            genderPath.enumValues &&
            !genderPath.enumValues.includes(userDetailsFields.gender)
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "gender",
                  msg: `Gender must be one of: ${genderPath.enumValues.join(", ")}`,
                },
              ],
              "Validation Error",
              400,
            );
          }
        } else if (genderPath.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "gender", msg: "Gender is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (userDetailsFields.fatherName !== undefined) {
        const fatherNameStr = userDetailsFields.fatherName
          ? String(userDetailsFields.fatherName).trim()
          : "";
        if (fatherNameStr) {
          const fatherNamePath = userDetailsSchemaPaths.fatherName;
          if (
            fatherNamePath.minlength &&
            fatherNameStr.length < fatherNamePath.minlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "fatherName",
                  msg: `Father's name must be at least ${fatherNamePath.minlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (
            fatherNamePath.maxlength &&
            fatherNameStr.length > fatherNamePath.maxlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "fatherName",
                  msg: `Father's name must be at most ${fatherNamePath.maxlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          userDetailsFields.fatherName = fatherNameStr;
        } else if (userDetailsSchemaPaths.fatherName.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "fatherName", msg: "Father's name is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (userDetailsFields.motherName !== undefined) {
        const motherNameStr = userDetailsFields.motherName
          ? String(userDetailsFields.motherName).trim()
          : "";
        if (motherNameStr) {
          const motherNamePath = userDetailsSchemaPaths.motherName;
          if (
            motherNamePath.minlength &&
            motherNameStr.length < motherNamePath.minlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "motherName",
                  msg: `Mother's name must be at least ${motherNamePath.minlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (
            motherNamePath.maxlength &&
            motherNameStr.length > motherNamePath.maxlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "motherName",
                  msg: `Mother's name must be at most ${motherNamePath.maxlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          userDetailsFields.motherName = motherNameStr;
        } else if (userDetailsSchemaPaths.motherName.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "motherName", msg: "Mother's name is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (
        userDetailsFields.height !== undefined &&
        userDetailsFields.height !== "" &&
        userDetailsFields.height !== null
      ) {
        const heightNum = Number(userDetailsFields.height);
        if (Number.isNaN(heightNum)) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "height", msg: "Height must be a valid number" }],
            "Validation Error",
            400,
          );
        }
        const heightPath = userDetailsSchemaPaths.height;
        if (heightPath.min !== undefined && heightNum < heightPath.min) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "height",
                msg: `Height must be at least ${heightPath.min}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        if (heightPath.max !== undefined && heightNum > heightPath.max) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "height",
                msg: `Height must be at most ${heightPath.max}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        userDetailsFields.height = heightNum;
      }

      if (
        userDetailsFields.weight !== undefined &&
        userDetailsFields.weight !== "" &&
        userDetailsFields.weight !== null
      ) {
        const weightNum = Number(userDetailsFields.weight);
        if (Number.isNaN(weightNum)) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "weight", msg: "Weight must be a valid number" }],
            "Validation Error",
            400,
          );
        }
        const weightPath = userDetailsSchemaPaths.weight;
        if (weightPath.min !== undefined && weightNum < weightPath.min) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "weight",
                msg: `Weight must be at least ${weightPath.min}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        if (weightPath.max !== undefined && weightNum > weightPath.max) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "weight",
                msg: `Weight must be at most ${weightPath.max}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        userDetailsFields.weight = weightNum;
      }

      if (userDetailsFields.address !== undefined) {
        const addressStr = userDetailsFields.address
          ? String(userDetailsFields.address).trim()
          : "";
        if (addressStr) {
          const addressPath = userDetailsSchemaPaths.address;
          if (
            addressPath.minlength &&
            addressStr.length < addressPath.minlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "address",
                  msg: `Address must be at least ${addressPath.minlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          if (
            addressPath.maxlength &&
            addressStr.length > addressPath.maxlength
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "address",
                  msg: `Address must be at most ${addressPath.maxlength} characters`,
                },
              ],
              "Validation Error",
              400,
            );
          }
          userDetailsFields.address = addressStr;
        } else if (userDetailsSchemaPaths.address.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "address", msg: "Address is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (userDetailsFields.maritalStatus !== undefined) {
        const maritalStatusPath = userDetailsSchemaPaths.maritalStatus;
        if (userDetailsFields.maritalStatus) {
          if (
            maritalStatusPath.enumValues &&
            !maritalStatusPath.enumValues.includes(
              userDetailsFields.maritalStatus,
            )
          ) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [
                {
                  path: "maritalStatus",
                  msg: `Marital status must be one of: ${maritalStatusPath.enumValues.join(", ")}`,
                },
              ],
              "Validation Error",
              400,
            );
          }
        } else if (maritalStatusPath.isRequired) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [{ path: "maritalStatus", msg: "Marital status is required" }],
            "Validation Error",
            400,
          );
        }
      }

      if (
        userDetailsFields.bloodGroup !== undefined &&
        userDetailsFields.bloodGroup
      ) {
        const bloodGroupPath = userDetailsSchemaPaths.bloodGroup;
        if (
          bloodGroupPath.enumValues &&
          !bloodGroupPath.enumValues.includes(userDetailsFields.bloodGroup)
        ) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "bloodGroup",
                msg: `Blood group must be one of: ${bloodGroupPath.enumValues.join(", ")}`,
              },
            ],
            "Validation Error",
            400,
          );
        }
      }

      if (userDetailsFields.education !== undefined) {
        const educationResult = validateEducationInput(
          userDetailsFields.education,
        );
        if (!educationResult.ok) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            educationResult.errors,
            "Validation Error",
            400,
          );
        }
        userDetailsFields.education = educationResult.value;
      }

      if (userDetailsFields.occupation !== undefined) {
        const occupationStr = userDetailsFields.occupation
          ? String(userDetailsFields.occupation).trim()
          : "";
        const occupationPath = userDetailsSchemaPaths.occupation;
        if (
          occupationPath &&
          occupationPath.maxlength &&
          occupationStr.length > occupationPath.maxlength
        ) {
          await session.abortTransaction();
          session.endSession();
          return response.errorResponse(
            res,
            [
              {
                path: "occupation",
                msg: `Occupation must be at most ${occupationPath.maxlength} characters`,
              },
            ],
            "Validation Error",
            400,
          );
        }
        userDetailsFields.occupation = occupationStr || undefined;
      }

      if (userDetailsFields.occupationDetails !== undefined) {
        const built = buildOccupationDetails(
          userDetailsFields.occupation,
          userDetailsFields.occupationDetails,
        );
        userDetailsFields.occupationDetails = built;
      }

      // Update User if there are fields to update
      let updatedUser = currentUser;
      if (Object.keys(userFields).length > 0) {
        updatedUser = await User.findByIdAndUpdate(
          userId,
          { $set: userFields },
          { returnDocument: "after", runValidators: true, session },
        )
          .select("-password -pwdRef -passwordCopy")
          .lean();
      }

      // Update or create UserDetails
      let userDetails = await UserDetails.findOne({ userId }).session(session);

      if (Object.keys(userDetailsFields).length > 0) {
        if (
          userDetailsFields.countryCode !== undefined ||
          userDetailsFields.stateCode !== undefined ||
          userDetailsFields.cityId !== undefined ||
          userDetailsFields.villageId !== undefined
        ) {
          const country = normalizeIndiaCountryCode(
            userDetailsFields.countryCode,
            { defaultIfEmpty: true },
          );
          if (country.errors.length > 0) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              country.errors,
              "Validation Error",
              400,
            );
          }
          userDetailsFields.countryCode = country.countryCode;
        }

        const userDetailsUnset = {};
        if (userDetailsFields.villageId !== undefined) {
          if (
            userDetailsFields.villageId === null ||
            userDetailsFields.villageId === ""
          ) {
            userDetailsUnset.villageId = "";
            delete userDetailsFields.villageId;
          } else if (
            mongoose.Types.ObjectId.isValid(userDetailsFields.villageId)
          ) {
            userDetailsFields.villageId = new mongoose.Types.ObjectId(
              userDetailsFields.villageId,
            );
          } else {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: "villageId", msg: "Invalid village ID format" }],
              "Validation Error",
              400,
            );
          }
        }

        const hierarchyObjectIdFields = [
          "community",
          "vansh",
          "kul",
          "khamp",
          "subKhamp",
          "gotra",
        ];
        for (const field of hierarchyObjectIdFields) {
          if (userDetailsFields[field] === undefined) continue;
          if (!userDetailsFields[field]) continue;
          if (!mongoose.Types.ObjectId.isValid(userDetailsFields[field])) {
            await session.abortTransaction();
            session.endSession();
            return response.errorResponse(
              res,
              [{ path: field, msg: `Invalid ${field} ID format` }],
              "Validation Error",
              400,
            );
          }
          userDetailsFields[field] = new mongoose.Types.ObjectId(
            userDetailsFields[field],
          );
        }

        if (userDetailsFields.community) {
          await User.findByIdAndUpdate(
            userId,
            { $set: { community: userDetailsFields.community } },
            { session },
          );
        }

        const updateOp = { $set: userDetailsFields };
        if (Object.keys(userDetailsUnset).length > 0) {
          updateOp.$unset = userDetailsUnset;
        }
        updateOp.$setOnInsert = {
          userId: new mongoose.Types.ObjectId(userId),
        };

        userDetails = await UserDetails.findOneAndUpdate(
          { userId },
          updateOp,
          {
            returnDocument: "after",
            upsert: true,
            runValidators: true,
            session,
            setDefaultsOnInsert: true,
          },
        ).lean();
      } else {
        if (userDetails) {
          userDetails = await UserDetails.findOne({ userId }).lean();
        }
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

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

        // Populate gotra label
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

      // Combine updated user and userDetails
      const profileData = {
        ...updatedUser,
        userDetails: userDetails || null,
      };

      return response.successResponse(
        res,
        profileData,
        "Profile updated successfully",
      );
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    console.error("Error in updateProfile:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((error) => ({
        path: error.path,
        msg: error.message,
      }));
      return response.errorResponse(res, errors, "Validation Error", 400);
    }
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

/**
 * GET /api/users/profile-requirements
 * Field requirements for profile completion & matrimonial (single source of truth).
 * @access Private
 */
const getProfileRequirements = async (req, res) => {
  try {
    return response.successResponse(
      res,
      getProfileRequirementsResponse(),
      "Profile requirements retrieved successfully",
    );
  } catch (err) {
    console.error("Error in getProfileRequirements:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProfileRequirements,
};
