const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const User = require("../../../models/User");
const Wallet = require("../../../models/Wallet");
const WalletTransaction = require("../../../models/WalletTransaction");
const MembershipPlan = require("../../../models/MembershipPlan");
const PaymentHistory = require("../../../models/PaymentHistory");
const CommonSettings = require("../../../models/CommonSettings");
const response = require("../../../config/response");
const {
  sanitizeError,
  sanitizeDuplicateKeyError,
} = require("../../../utils/errorSanitizer");
const { generateMemberIdFromPhone } = require("../../../utils/helper");
const { toTitleCase } = require("../../../utils/inputValidation");
const { decryptPassword } = require("../../../utils/passwordEncryption");
const emailService = require("../../../services/email");
const {
  activateMembershipFromPayment,
} = require("../../../services/membershipPaymentService");
const { resolveActiveCommunity } = require("../../../utils/communityHelper");

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

const WALLET_TX_SOURCES = [
  "referral_commission",
  "admin_adjust",
  "membership_create",
];

/**
 * GET /api/users/wallet
 * Own wallet balance + paginated transaction history.
 * Auth only — expired users can still view balance/history.
 */
const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(res, {}, "Invalid user", 400);
    }

    const {
      page = 1,
      limit = 20,
      type = "",
      source = "",
    } = req.query;

    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * pageSize;

    const user = await User.findById(userId)
      .select("memberId name")
      .lean();

    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    const wallet = await Wallet.findOne({ userId }).lean();

    if (!wallet) {
      return response.successResponse(
        res,
        {
          memberId: user.memberId,
          balance: 0,
          wallet: null,
          data: [],
          pagination: {
            page: currentPage,
            limit: pageSize,
            total: 0,
            pages: 0,
          },
        },
        "Wallet retrieved successfully",
      );
    }

    const query = { walletId: wallet._id };
    if (type && ["credit", "debit"].includes(type)) {
      query.type = type;
    }
    if (source && WALLET_TX_SOURCES.includes(source)) {
      query.source = source;
    }

    const [data, totalRecord] = await Promise.all([
      WalletTransaction.find(query)
        .populate("fromUserId", "memberId name")
        .populate({
          path: "donationRequestId",
          select: "donorName amount userId",
          populate: { path: "userId", select: "memberId name" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      WalletTransaction.countDocuments(query),
    ]);

    return response.successResponse(
      res,
      {
        memberId: user.memberId,
        balance: wallet.balance || 0,
        wallet: {
          _id: wallet._id,
          balance: wallet.balance || 0,
          updatedAt: wallet.updatedAt,
        },
        data,
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: totalRecord,
          pages: Math.ceil(totalRecord / pageSize) || 0,
        },
      },
      "Wallet retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching user wallet:", error);
    return response.errorResponse(res, {}, "Failed to fetch wallet", 500);
  }
};

/**
 * GET /api/users/referrals
 * Direct users who registered with the authenticated user's Member ID.
 */
const getDirectReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(res, {}, "Invalid user", 400);
    }

    const pageSize = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const currentPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (currentPage - 1) * pageSize;

    const user = await User.findById(userId).select("memberId").lean();
    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    const query = { referralId: user.memberId };
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
        data,
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: totalRecord,
          pages: Math.ceil(totalRecord / pageSize) || 0,
        },
      },
      "Direct referrals retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching direct referrals:", error);
    return response.errorResponse(res, {}, "Failed to fetch referrals", 500);
  }
};

/**
 * POST /api/users/wallet/create-user
 * Create a new member using the authenticated user's wallet balance.
 * Mirrors public registration (plan + credentials), but pays from wallet
 * and activates membership immediately.
 */
const createUserFromWallet = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const creatorId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(creatorId)) {
      return response.errorResponse(res, {}, "Invalid user", 400);
    }

    const settings = await CommonSettings.getOrCreateSettings();
    if (!settings.registerEnabled) {
      return response.errorResponse(
        res,
        [{ msg: "Registration is currently disabled. Please contact support." }],
        "Registration is currently disabled. Please contact support.",
        403,
      );
    }

    const { name, phone, email, password, planId, community } = req.body;

    if (!name || !phone || !email || !password || !planId || !community) {
      return response.errorResponse(
        res,
        [
          {
            msg: "Name, phone, email, password, community, and plan are required.",
          },
        ],
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

    const nameStr = String(name).trim();
    if (nameStr.length < 3 || nameStr.length > 50) {
      return response.errorResponse(
        res,
        [{ path: "name", msg: "Name must be between 3 and 50 characters." }],
        "Validation Error",
        400,
      );
    }

    if (String(password).length < 6) {
      return response.errorResponse(
        res,
        [{ path: "password", msg: "Password must be at least 6 characters." }],
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

    const planPrice = roundMoney(Number(plan.price) || 0);
    if (planPrice < 0.01) {
      return response.errorResponse(
        res,
        [{ path: "planId", msg: "Selected plan has an invalid price." }],
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

    const creator = await User.findById(creatorId).select(
      "memberId name phone status isPaid",
    );
    if (!creator) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    if (creator.status !== 1 || !creator.isPaid) {
      return response.errorResponse(
        res,
        [{ msg: "Only active members can create users from wallet." }],
        "Only active members can create users from wallet.",
        403,
      );
    }

    if (!creator.memberId) {
      return response.errorResponse(
        res,
        [{ msg: "Your Member ID is missing. Please contact support." }],
        "Your Member ID is missing. Please contact support.",
        400,
      );
    }

    let createdUser;
    let paymentHistory;
    let activationResult;
    let walletBalanceAfter;
    let debitAmount;

    await session.withTransaction(async () => {
      const wallet = await Wallet.findOne({ userId: creatorId }).session(
        session,
      );
      const currentBalance = roundMoney(Number(wallet?.balance) || 0);

      if (!wallet || currentBalance < planPrice) {
        const err = new Error(
          `Insufficient wallet balance. Required ₹${planPrice.toLocaleString("en-IN")}, available ₹${currentBalance.toLocaleString("en-IN")}.`,
        );
        err.code = "INSUFFICIENT_BALANCE";
        throw err;
      }

      const memberId = await generateMemberIdFromPhone(phoneStr, session);

      if (memberId === creator.memberId) {
        throw new Error("Cannot create a user with your own Member ID.");
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

      createdUser = new User({
        memberId,
        name: toTitleCase(nameStr),
        phone: phoneStr,
        email: String(email).trim().toLowerCase(),
        password: hashedPassword,
        pwdRef: password,
        status: 4,
        isPaid: false,
        membershipPlanId: plan._id,
        community: communityResult.communityId,
        uuid,
        referralId: creator.memberId,
      });

      await createdUser.save({ session });

      const orderId = `WALLET_${String(creator._id).slice(-8)}_${Date.now()}_${uuidv4().replace(/-/g, "").slice(0, 8)}`;

      paymentHistory = new PaymentHistory({
        userId: createdUser._id,
        userName: createdUser.name,
        paymentId: orderId,
        paymentType: "Activation",
        amount: planPrice,
        method: "Wallet",
        status: "pending",
        orderId,
        selectedPlan: plan._id,
        remarks: `Wallet-funded membership create by ${creator.memberId}`,
      });

      await paymentHistory.save({ session });

      debitAmount = planPrice;
      walletBalanceAfter = roundMoney(currentBalance - planPrice);
      wallet.balance = walletBalanceAfter;
      await wallet.save({ session });

      const debitTx = new WalletTransaction({
        walletId: wallet._id,
        type: "debit",
        amount: debitAmount,
        balanceAfter: walletBalanceAfter,
        source: "membership_create",
        // Do not set paymentHistoryId here — registration commission uses that
        // unique key for idempotent referral credit on activation.
        fromUserId: createdUser._id,
        remarks: `Created user ${createdUser.name} (Member ID: ${createdUser.memberId}) with ${plan.name} plan.`,
      });
      await debitTx.save({ session });

      activationResult = await activateMembershipFromPayment({
        paymentHistory,
        paymentMethod: "Wallet",
        session,
      });

      // Balance may change again if referral commission is credited on activation.
      const refreshedWallet = await Wallet.findOne({ userId: creatorId })
        .session(session)
        .lean();
      walletBalanceAfter = roundMoney(
        Number(refreshedWallet?.balance ?? walletBalanceAfter) || 0,
      );
    });

    const plainPassword = createdUser.pwdRef
      ? decryptPassword(createdUser.pwdRef)
      : password;

    try {
      if (createdUser.email && plainPassword) {
        await emailService.sendActiveUserWelcomeEmail({
          name: createdUser.name,
          email: createdUser.email,
          memberId: createdUser.memberId,
          password: plainPassword,
        });
      }
    } catch (emailError) {
      console.error(
        "Failed to send wallet-create welcome email:",
        emailError,
      );
    }

    const sanitizedUser = createdUser.toObject
      ? createdUser.toObject()
      : { ...createdUser };
    delete sanitizedUser.password;
    delete sanitizedUser.pwdRef;
    delete sanitizedUser.passwordCopy;

    return response.successResponse(
      res,
      {
        user: {
          _id: sanitizedUser._id,
          memberId: sanitizedUser.memberId,
          name: sanitizedUser.name,
          phone: sanitizedUser.phone,
          email: sanitizedUser.email,
          status: activationResult?.user?.status ?? 1,
          isPaid: true,
          membershipPlanId: plan._id,
        },
        credentials: {
          memberId: createdUser.memberId,
          password: plainPassword,
        },
        plan: {
          _id: plan._id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          durationType: plan.durationType,
          durationValue: plan.durationValue,
        },
        payment: {
          _id: paymentHistory._id,
          orderId: paymentHistory.orderId,
          amount: debitAmount,
          method: "Wallet",
          status: "success",
        },
        wallet: {
          balance: walletBalanceAfter,
          deducted: debitAmount,
        },
        summary: `Created ${createdUser.name} (Member ID: ${createdUser.memberId}) with ${plan.name} plan. ₹${debitAmount.toLocaleString("en-IN")} deducted from your wallet.`,
      },
      "User created and membership activated from wallet successfully.",
    );
  } catch (err) {
    console.error("Wallet create-user error:", err);

    if (err.code === "INSUFFICIENT_BALANCE") {
      return response.errorResponse(
        res,
        [{ path: "balance", msg: err.message }],
        err.message,
        400,
      );
    }

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
  getWallet,
  getDirectReferrals,
  createUserFromWallet,
};
