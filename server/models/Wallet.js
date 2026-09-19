const mongoose = require("mongoose");
const { Schema } = mongoose;

const WalletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Wallet = mongoose.model("wallets", WalletSchema);

module.exports = Wallet;
