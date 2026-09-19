const mongoose = require("mongoose");
const { Schema } = mongoose;

const SUBSCRIPTION_STATUSES = ["active", "expired", "cancelled"];

const UserSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "membership_plans",
      required: true,
      index: true,
    },
    paymentHistoryId: {
      type: Schema.Types.ObjectId,
      ref: "payment_history",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "active",
      required: true,
      index: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

UserSubscriptionSchema.index({ userId: 1, createdAt: -1 });
UserSubscriptionSchema.index({ status: 1, endDate: 1 });

const UserSubscription = mongoose.model(
  "user_subscriptions",
  UserSubscriptionSchema,
);

module.exports = UserSubscription;
module.exports.SUBSCRIPTION_STATUSES = SUBSCRIPTION_STATUSES;
