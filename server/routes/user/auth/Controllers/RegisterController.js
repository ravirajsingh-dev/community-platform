const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const User = require("../../../../models/User");
const MembershipPlan = require("../../../../models/MembershipPlan");
const response = require("../../../../config/response");
const {
  sanitizeError,
  sanitizeDuplicateKeyError,
} = require("../../../../utils/errorSanitizer");
const emailService = require("../../../../services/email");
const { decryptPassword } = require("../../../../utils/passwordEncryption");
const { generateMemberIdFromPhone } = require("../../../../utils/helper");
const { checkRegistrationAvailability } = require("../../../../utils/membershipHelper");
const { toTitleCase } = require("../../../../utils/inputValidation");
const { resolveActiveCommunity } = require("../../../../utils/communityHelper");

const register = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const registrationCheck = await checkRegistrationAvailability();
    if (!registrationCheck.allowed) {
      return response.errorResponse(
        res,
        [{ msg: registrationCheck.reason }],
        registrationCheck.reason,
        403,
      );
    }

    const { name, phone, email, password, planId, referralId, community } =
      req.body;

    if (!name || !phone || !password || !planId || !community) {
      return response.errorResponse(
        res,
        [{ msg: "Name, phone, password, community, and plan are required." }],
        "Validation Error",
        400,
      );
    }

    const communityResult = await resolveActiveCommunity(community);
    if (communityResult.error) {
      return response.errorResponse(
        res,
        [communityResult.error],
        "Validation Error",
        400,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return response.errorResponse(
        res,
        [{ path: "planId", msg: "Invalid membership plan selected." }],
        "Validation Error",
        400,
      );
    }

    const plan = await MembershipPlan.findOne({ _id: planId, isActive: true });
    if (!plan) {
      return response.errorResponse(
        res,
        [{ path: "planId", msg: "Selected membership plan is not available." }],
        "Validation Error",
        400,
      );
    }

    const phoneStr = String(phone).trim();
    if (phoneStr.length !== 10) {
      return response.errorResponse(
        res,
        [{ path: "phone", msg: "Phone number must be 10 digits." }],
        "Validation Error",
        400,
      );
    }

    let resolvedReferralId;
    if (referralId) {
      const referrer = await User.findOne({ memberId: referralId }).select(
        "memberId phone status",
      );
      if (!referrer || referrer.status !== 1) {
        return response.errorResponse(
          res,
          [
            {
              path: "referralId",
              msg: "Referral Member ID was not found or is not active.",
            },
          ],
          "Validation Error",
          400,
        );
      }
      if (referrer.phone === phoneStr) {
        return response.errorResponse(
          res,
          [
            {
              path: "referralId",
              msg: "You cannot use your own Member ID as referral.",
            },
          ],
          "Validation Error",
          400,
        );
      }
      resolvedReferralId = referrer.memberId;
    }

    let user;

    await session.withTransaction(async () => {
      const memberId = await generateMemberIdFromPhone(phoneStr, session);

      if (resolvedReferralId && resolvedReferralId === memberId) {
        throw new Error("You cannot use your own Member ID as referral.");
      }

      const existingMemberId = await User.findOne({ memberId }).session(
        session,
      );
      if (existingMemberId) {
        throw new Error("Member ID collision detected. Please try again.");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const uuid = uuidv4();

      user = new User({
        memberId,
        name: toTitleCase(String(name)),
        phone: phoneStr,
        email: email || undefined,
        password: hashedPassword,
        pwdRef: password,
        status: 4,
        isPaid: false,
        membershipPlanId: plan._id,
        community: communityResult.communityId,
        uuid,
        ...(resolvedReferralId ? { referralId: resolvedReferralId } : {}),
      });

      await user.save({ session });
    });

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;
    delete sanitizedUser.pwdRef;
    delete sanitizedUser.passwordCopy;

    const plainPassword = user.pwdRef ? decryptPassword(user.pwdRef) : null;

    try {
      if (plainPassword) {
        await emailService.sendGuestUserWelcomeEmail({
          name: user.name,
          email: user.email,
          memberId: user.memberId,
          password: plainPassword,
        });
      }
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    return response.successResponse(
      res,
      {
        user: sanitizedUser,
        credentials: {
          memberId: user.memberId,
          password: plainPassword,
        },
        paymentRequired: true,
        planId: plan._id,
      },
      "Registration successful. Complete payment to activate your account.",
    );
  } catch (err) {
    console.error("Registration error:", err);

    if (err.message && err.message.includes("Maximum number of users")) {
      return response.errorResponse(
        res,
        [
          {
            path: "phone",
            msg: "Operation limit reached. Please contact support.",
          },
        ],
        "Operation limit reached",
        400,
      );
    }

    if (err.code === 11000) {
      const sanitizedError = sanitizeDuplicateKeyError(err, "phone");
      return response.errorResponse(
        res,
        [sanitizedError],
        "Duplicate field error",
        400,
      );
    }

    if (err.message) {
      const sanitizedMsg = sanitizeError(err.message, "validation");
      return response.errorResponse(
        res,
        [{ msg: sanitizedMsg }],
        sanitizedMsg,
        400,
      );
    }

    return response.errorResponse(res, {}, "An error occurred", 500);
  } finally {
    await session.endSession();
  }
};

module.exports = {
  register,
};
