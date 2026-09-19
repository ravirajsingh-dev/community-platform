const UserDetails = require("../../../models/UserDetails");
const User = require("../../../models/User");
const response = require("../../../config/response");
const { buildOccupationDetails } = require("../../../utils/occupationHelper");
const {
  validateEducationInput,
  ensureEducationArray,
} = require("../../../utils/educationHelper");
const {
  enrichUserDetailsLocation,
  normalizeIndiaCountryCode,
} = require("../../../utils/locationHelper");
const mongoose = require("mongoose");

// Get user details
module.exports.getUserDetails = async (req, res) => {
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

    const userDetails = await UserDetails.findOne({ userId })
      .populate("userId", "name phone email memberId")
      .lean();

    if (!userDetails) {
      return response.successResponse(res, null, "User details not found");
    }

    ensureEducationArray(userDetails);
    await enrichUserDetailsLocation(userDetails);

    return response.successResponse(res, userDetails, "User details");
  } catch (err) {
    console.error(err.message);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

// Create or update user details
module.exports.createOrUpdateUserDetails = async (req, res) => {
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

    const {
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

    const occupationTrimmed = occupation
      ? String(occupation).trim()
      : undefined;

    let educationNormalized;
    if (Object.prototype.hasOwnProperty.call(req.body, "education")) {
      const educationResult = validateEducationInput(education);
      if (!educationResult.ok) {
        return response.errorResponse(
          res,
          educationResult.errors,
          "Validation Error",
          400,
        );
      }
      educationNormalized = educationResult.value;
    }

    const user = await User.findById(userId);
    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    let userDetails = await UserDetails.findOne({ userId });
    const builtOccupationDetails = buildOccupationDetails(
      occupationTrimmed,
      occupationDetailsRaw,
    );
    const userDetailsUnset = {};
    if (
      Object.prototype.hasOwnProperty.call(req.body, "villageId") &&
      (villageId === null || villageId === "")
    ) {
      userDetailsUnset.villageId = "";
    }
    const userDetailsData = {
      userId,
      dob: dob || undefined,
      gender: gender || undefined,
      fatherName: fatherName || undefined,
      motherName: motherName || undefined,
      height:
        height !== undefined && height !== "" && height !== null
          ? Number(height)
          : undefined,
      weight:
        weight !== undefined && weight !== "" && weight !== null
          ? Number(weight)
          : undefined,
      address: address || undefined,
      countryCode: (() => {
        if (!countryCode && !stateCode && !cityId && !villageId) return undefined;
        const normalized = normalizeIndiaCountryCode(countryCode, {
          defaultIfEmpty: true,
        });
        return normalized.countryCode || undefined;
      })(),
      stateCode: stateCode ? String(stateCode).trim() : undefined,
      cityId: cityId ? String(cityId).trim() : undefined,
      villageId:
        villageId && mongoose.Types.ObjectId.isValid(villageId)
          ? new mongoose.Types.ObjectId(villageId)
          : undefined,
      community:
        community && mongoose.Types.ObjectId.isValid(community)
          ? new mongoose.Types.ObjectId(community)
          : undefined,
      vansh:
        vansh && mongoose.Types.ObjectId.isValid(vansh)
          ? new mongoose.Types.ObjectId(vansh)
          : undefined,
      kul:
        kul && mongoose.Types.ObjectId.isValid(kul)
          ? new mongoose.Types.ObjectId(kul)
          : undefined,
      khamp:
        khamp && mongoose.Types.ObjectId.isValid(khamp)
          ? new mongoose.Types.ObjectId(khamp)
          : undefined,
      subKhamp:
        subKhamp && mongoose.Types.ObjectId.isValid(subKhamp)
          ? new mongoose.Types.ObjectId(subKhamp)
          : undefined,
      gotra:
        gotra && mongoose.Types.ObjectId.isValid(gotra)
          ? new mongoose.Types.ObjectId(gotra)
          : undefined,
      maritalStatus: maritalStatus || undefined,
      occupation: occupationTrimmed || undefined,
      occupationDetails: builtOccupationDetails,
      bloodGroup: bloodGroup || undefined,
    };

    if (educationNormalized !== undefined) {
      userDetailsData.education = educationNormalized;
    }

    if (userDetailsUnset.villageId !== undefined) {
      delete userDetailsData.villageId;
    }

    if (userDetails) {
      const updateOp = { $set: userDetailsData };
      if (Object.keys(userDetailsUnset).length > 0) {
        updateOp.$unset = userDetailsUnset;
      }
      userDetails = await UserDetails.findOneAndUpdate(
        { userId },
        updateOp,
        { returnDocument: "after", runValidators: true },
      ).lean();
    } else {
      const newUserDetails = new UserDetails(userDetailsData);
      await newUserDetails.save();
      userDetails = await UserDetails.findById(newUserDetails._id).lean();
    }

    await enrichUserDetailsLocation(userDetails);
    ensureEducationArray(userDetails);

    return response.successResponse(res, userDetails, "User details saved");
  } catch (err) {
    console.error("Error in createOrUpdateUserDetails:", err);
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

module.exports.getUserWithDetails = async (req, res) => {
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

    const user = await User.findById(userId)
      .select("-password -passwordCopy")
      .lean();

    if (!user) {
      return response.errorResponse(
        res,
        { msg: "User not found" },
        "User not found",
        404,
      );
    }

    const userDetails = await UserDetails.findOne({ userId }).lean();
    if (userDetails) {
      ensureEducationArray(userDetails);
      await enrichUserDetailsLocation(userDetails);
    }

    const userData = {
      ...user,
      userDetails: userDetails || null,
    };

    return response.successResponse(res, userData, "User with details");
  } catch (err) {
    console.error(err.message);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};
