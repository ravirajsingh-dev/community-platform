const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const response = require("../../../config/response");
const Admin = require("../../../models/Admin");
const SubAdmin = require("../../../models/SubAdmin");

const SENSITIVE_FIELDS =
  "-password -admPwdRef -txnRef -passCopy -txnPassCopy";

const getCurrentModel = (role) => {
  if (role === 3) return SubAdmin;
  return Admin;
};

const sanitizeProfile = (doc, isSubAdmin) => {
  if (!doc) return null;
  const cleaned = doc.toObject ? doc.toObject() : { ...doc };
  delete cleaned.password;
  delete cleaned.admPwdRef;
  delete cleaned.txnRef;
  delete cleaned.passCopy;
  delete cleaned.txnPassCopy;
  delete cleaned.txn_password;
  cleaned.isTxnPassSet = Boolean(doc.txn_password);
  cleaned.isSubAdmin = isSubAdmin;
  return cleaned;
};

module.exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const isSubAdmin = role === 3 || req.isSubAdmin;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid user id." }],
        "Validation Error",
        400,
      );
    }

    const Model = getCurrentModel(role);
    const profile = await Model.findById(userId).select(SENSITIVE_FIELDS).lean();

    if (!profile) {
      return response.errorResponse(
        res,
        [{ msg: "Profile not found." }],
        "Profile not found.",
        404,
      );
    }

    return response.successResponse(
      res,
      sanitizeProfile(profile, isSubAdmin),
      "Profile details",
    );
  } catch (err) {
    console.error("Error in getMyProfile:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};

module.exports.updateMyProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.errorResponse(res, errors.array(), "Validation Error", 400);
  }

  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const isSubAdmin = role === 3 || req.isSubAdmin;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(
        res,
        [{ path: "id", msg: "Invalid user id." }],
        "Validation Error",
        400,
      );
    }

    const Model = getCurrentModel(role);
    const existingProfile = await Model.findById(userId).lean();

    if (!existingProfile) {
      return response.errorResponse(
        res,
        [{ msg: "Profile not found." }],
        "Profile not found.",
        404,
      );
    }

    const updates = {};
    const { name, phone, email } = req.body;

    if (name !== undefined) updates.name = String(name).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (!isSubAdmin && phone !== undefined) {
      updates.phone = String(phone).trim();
    }

    if (updates.phone) {
      const phoneTaken = await Admin.findOne({
        phone: updates.phone,
        _id: { $ne: userId },
      }).lean();

      if (phoneTaken) {
        return response.errorResponse(
          res,
          [{ path: "phone", msg: "Provided phone is already registered." }],
          "Validation Error",
          400,
        );
      }
    }

    if (updates.email) {
      const [adminEmail, subAdminEmail] = await Promise.all([
        Admin.findOne({ email: updates.email, _id: { $ne: userId } }).lean(),
        SubAdmin.findOne({ email: updates.email, _id: { $ne: userId } }).lean(),
      ]);

      if (adminEmail || subAdminEmail) {
        return response.errorResponse(
          res,
          [{ path: "email", msg: "Provided email is already registered." }],
          "Validation Error",
          400,
        );
      }
    }

    const updatedProfile = await Model.findByIdAndUpdate(
      userId,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    )
      .select(SENSITIVE_FIELDS)
      .lean();

    return response.successResponse(
      res,
      sanitizeProfile(updatedProfile, isSubAdmin),
      "Profile updated successfully.",
    );
  } catch (err) {
    console.error("Error in updateMyProfile:", err);
    return response.errorResponse(res, {}, "An error occurred", 500);
  }
};
