const mongoose = require("mongoose");
const { Schema } = mongoose;

const WalletTransactionSchema = new Schema(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "wallets",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      enum: ["referral_commission", "admin_adjust", "membership_create"],
      required: true,
      index: true,
    },
    paymentHistoryId: {
      type: Schema.Types.ObjectId,
      ref: "payment_history",
      index: true,
    },
    donationRequestId: {
      type: Schema.Types.ObjectId,
      ref: "donation_requests",
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
WalletTransactionSchema.index(
  { paymentHistoryId: 1 },
  {
    unique: true,
    sparse: true,
    name: "wallet_transaction_payment_history_id_unique",
  },
);
WalletTransactionSchema.index(
  { donationRequestId: 1 },
  {
    unique: true,
    sparse: true,
    name: "wallet_transaction_donation_request_id_unique",
  },
);

const WalletTransaction = mongoose.model(
  "wallet_transactions",
  WalletTransactionSchema,
);

module.exports = WalletTransaction;
