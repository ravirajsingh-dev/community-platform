const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const response = require("../../../config/response");
const User = require("../../../models/User");
const Wallet = require("../../../models/Wallet");
const WalletTransaction = require("../../../models/WalletTransaction");

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

/**
 * GET /api/admin/wallets/resolve-member?memberId=9999999999-01
 * Resolve a member before a manual credit/debit adjustment.
 */
const resolveWalletMember = async (req, res) => {
  try {
    const memberId = String(req.query.memberId || "").trim();
    if (!/^\d{10}-\d{2}$/.test(memberId)) {
      return response.errorResponse(
        res,
        [{ path: "memberId", msg: "Enter a valid Member ID" }],
        "Enter a valid Member ID",
        400,
      );
    }

    const user = await User.findOne({ memberId })
      .select("_id memberId name status")
      .lean();
    if (!user) {
      return response.errorResponse(
        res,
        [{ path: "memberId", msg: "Member not found" }],
        "Member not found",
        404,
      );
    }

    const wallet = await Wallet.findOne({ userId: user._id })
      .select("_id balance")
      .lean();

    return response.successResponse(
      res,
      {
        user,
        wallet: wallet || null,
        balance: wallet?.balance || 0,
      },
      "Member resolved successfully",
    );
  } catch (error) {
    console.error("Error resolving wallet member:", error);
    return response.errorResponse(res, {}, "Failed to resolve member", 500);
  }
};

/**
 * GET /api/admin/wallets
 * List wallets with user info (paginated).
 */
const getWallets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      memberId = "",
      name = "",
      phone = "",
      orderBy = "updatedAt",
      ascending = "false",
    } = req.query;

    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * pageSize;
    const sortOrder = String(ascending) === "true" ? 1 : -1;
    const allowedOrderFields = ["balance", "updatedAt", "createdAt"];
    const sortField = allowedOrderFields.includes(orderBy)
      ? orderBy
      : "updatedAt";

    const userMatch = {};
    if (memberId.trim()) {
      userMatch.memberId = {
        $regex: String(memberId).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }
    if (name.trim()) {
      userMatch.name = {
        $regex: String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }
    if (phone.trim()) {
      userMatch.phone = {
        $regex: String(phone).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ];

    if (Object.keys(userMatch).length > 0) {
      const matchUser = {};
      Object.entries(userMatch).forEach(([key, value]) => {
        matchUser[`user.${key}`] = value;
      });
      pipeline.push({ $match: matchUser });
    }

    pipeline.push(
      {
        $facet: {
          data: [
            { $sort: { [sortField]: sortOrder, _id: -1 } },
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 1,
                balance: 1,
                createdAt: 1,
                updatedAt: 1,
                userId: 1,
                user: {
                  _id: "$user._id",
                  memberId: "$user.memberId",
                  name: "$user.name",
                  phone: "$user.phone",
                  email: "$user.email",
                  status: "$user.status",
                },
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    );

    const [result] = await Wallet.aggregate(pipeline);
    const data = result?.data || [];
    const totalRecord = result?.total?.[0]?.count || 0;

    return response.successResponse(
      res,
      {
        data,
        pagination: {
          page: Math.max(parseInt(page, 10) || 1, 1),
          limit: pageSize,
          total: totalRecord,
          pages: Math.ceil(totalRecord / pageSize) || 0,
        },
      },
      "Wallets fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching wallets:", error);
    return response.errorResponse(res, {}, "Failed to fetch wallets", 500);
  }
};

/**
 * GET /api/admin/wallets/users/:userId/transactions
 */
const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(res, {}, "Invalid user ID", 400);
    }

    const {
      page = 1,
      limit = 20,
      type = "",
      source = "",
    } = req.query;

    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * pageSize;

    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) {
      return response.successResponse(
        res,
        {
          wallet: null,
          data: [],
          pagination: {
            page: 1,
            limit: pageSize,
            total: 0,
            pages: 0,
          },
        },
        "No wallet found for user",
      );
    }

    const query = { walletId: wallet._id };
    if (type && ["credit", "debit"].includes(type)) {
      query.type = type;
    }
    if (source && ["referral_commission", "admin_adjust", "membership_create"].includes(source)) {
      query.source = source;
    }

    const [data, totalRecord, user] = await Promise.all([
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
      User.findById(userId).select("memberId name phone email").lean(),
    ]);

    return response.successResponse(
      res,
      {
        wallet: {
          ...wallet,
          user,
        },
        data,
        pagination: {
          page: Math.max(parseInt(page, 10) || 1, 1),
          limit: pageSize,
          total: totalRecord,
          pages: Math.ceil(totalRecord / pageSize) || 0,
        },
      },
      "Wallet transactions fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch wallet transactions",
      500,
    );
  }
};

/**
 * POST /api/admin/wallets/users/:userId/adjust
 * Body: { type: credit|debit, amount, remarks, txn_password }
 */
const adjustWallet = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return response.errorResponse(
        res,
        errors.array(),
        "Validation Error",
        400,
      );
    }

    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.errorResponse(res, {}, "Invalid user ID", 400);
    }

    const { type, amount, remarks } = req.body;

    if (!["credit", "debit"].includes(type)) {
      return response.errorResponse(
        res,
        [{ path: "type", msg: "type must be credit or debit" }],
        "Validation Error",
        400,
      );
    }

    const numAmount =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (
      amount === "" ||
      amount === null ||
      amount === undefined ||
      Number.isNaN(numAmount) ||
      !Number.isFinite(numAmount) ||
      !Number.isInteger(numAmount) ||
      numAmount < 1 ||
      numAmount > 99999
    ) {
      return response.errorResponse(
        res,
        [
          {
            path: "amount",
            msg: "Amount must be a whole number from 1 to 99999",
          },
        ],
        "Validation Error",
        400,
      );
    }

    const roundedAmount = roundMoney(numAmount);

    const user = await User.findById(userId).select("_id memberId name");
    if (!user) {
      return response.errorResponse(res, {}, "User not found", 404);
    }

    let remarksStr = String(remarks || "").trim();
    if (!remarksStr) {
      const amountLabel = Number(roundedAmount).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      remarksStr =
        type === "credit"
          ? `Admin credited ₹${amountLabel} to your wallet.`
          : `Admin debited ₹${amountLabel} from your wallet.`;
    }
    if (remarksStr.length > 500) {
      return response.errorResponse(
        res,
        [{ path: "remarks", msg: "Remarks must be at most 500 characters" }],
        "Validation Error",
        400,
      );
    }

    let resultWallet;
    let resultTx;

    await session.withTransaction(async () => {
      let wallet = await Wallet.findOne({ userId }).session(session);

      if (!wallet) {
        if (type === "debit") {
          throw new Error("INSUFFICIENT_BALANCE");
        }
        wallet = new Wallet({ userId, balance: 0 });
        await wallet.save({ session });
      }

      const currentBalance = roundMoney(Number(wallet.balance) || 0);
      let balanceAfter;

      if (type === "credit") {
        balanceAfter = roundMoney(currentBalance + roundedAmount);
      } else {
        if (currentBalance < roundedAmount) {
          throw new Error("INSUFFICIENT_BALANCE");
        }
        balanceAfter = roundMoney(currentBalance - roundedAmount);
      }

      const tx = new WalletTransaction({
        walletId: wallet._id,
        type,
        amount: roundedAmount,
        balanceAfter,
        source: "admin_adjust",
        remarks: remarksStr,
      });
      await tx.save({ session });

      wallet.balance = balanceAfter;
      await wallet.save({ session });

      resultWallet = wallet;
      resultTx = tx;
    });

    return response.successResponse(
      res,
      {
        wallet: resultWallet,
        transaction: resultTx,
        user: {
          _id: user._id,
          memberId: user.memberId,
          name: user.name,
        },
      },
      `Wallet ${type}ed successfully`,
    );
  } catch (error) {
    if (error.message === "INSUFFICIENT_BALANCE") {
      return response.errorResponse(
        res,
        [{ path: "amount", msg: "Insufficient wallet balance" }],
        "Insufficient wallet balance",
        400,
      );
    }
    console.error("Error adjusting wallet:", error);
    return response.errorResponse(res, {}, "Failed to adjust wallet", 500);
  } finally {
    await session.endSession();
  }
};

/**
 * GET /api/admin/wallets/admin-adjustments
 * Separate history of all admin credit/debit adjustments.
 */
const getAdminAdjustments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = "",
      memberId = "",
      name = "",
    } = req.query;

    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * pageSize;

    const match = { source: "admin_adjust" };
    if (type && ["credit", "debit"].includes(String(type))) {
      match.type = type;
    }

    const userMatch = {};
    if (String(memberId).trim()) {
      userMatch.memberId = {
        $regex: String(memberId)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }
    if (String(name).trim()) {
      userMatch.name = {
        $regex: String(name)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "wallets",
          localField: "walletId",
          foreignField: "_id",
          as: "wallet",
        },
      },
      { $unwind: "$wallet" },
      {
        $lookup: {
          from: "users",
          localField: "wallet.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ];

    if (Object.keys(userMatch).length > 0) {
      const matchUser = {};
      Object.entries(userMatch).forEach(([key, value]) => {
        matchUser[`user.${key}`] = value;
      });
      pipeline.push({ $match: matchUser });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: skip },
          { $limit: pageSize },
          {
            $project: {
              _id: 1,
              type: 1,
              amount: 1,
              balanceAfter: 1,
              source: 1,
              remarks: 1,
              createdAt: 1,
              updatedAt: 1,
              walletId: 1,
              user: {
                _id: "$user._id",
                memberId: "$user.memberId",
                name: "$user.name",
                phone: "$user.phone",
              },
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    });

    const [result] = await WalletTransaction.aggregate(pipeline);
    const data = result?.data || [];
    const totalRecord = result?.total?.[0]?.count || 0;

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
      "Admin adjustments fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching admin adjustments:", error);
    return response.errorResponse(
      res,
      {},
      "Failed to fetch admin adjustments",
      500,
    );
  }
};

module.exports = {
  resolveWalletMember,
  getWallets,
  getWalletTransactions,
  getAdminAdjustments,
  adjustWallet,
};
