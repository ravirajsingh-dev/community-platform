const mongoose = require("mongoose");
const { Schema } = mongoose;

const DURATION_TYPES = ["days", "months", "years", "lifetime"];

const MembershipPlanSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      maxlength: 100,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      default: "INR",
      uppercase: true,
      maxlength: 3,
    },
    durationType: {
      type: String,
      enum: DURATION_TYPES,
      required: true,
    },
    durationValue: {
      type: Number,
      min: 1,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "admins",
    },
  },
  {
    timestamps: true,
  },
);

MembershipPlanSchema.index({ isActive: 1, price: 1 });
MembershipPlanSchema.index(
  { durationType: 1, durationValue: 1 },
  { unique: true },
);

MembershipPlanSchema.pre("validate", function () {
  if (this.durationType === "lifetime") {
    this.durationValue = null;
    return;
  }

  if (
    this.durationValue === null ||
    this.durationValue === undefined ||
    this.durationValue < 1
  ) {
    this.invalidate(
      "durationValue",
      "durationValue is required and must be at least 1 for non-lifetime plans",
    );
  }
});

const MembershipPlan = mongoose.model(
  "membership_plans",
  MembershipPlanSchema,
);

module.exports = MembershipPlan;
module.exports.DURATION_TYPES = DURATION_TYPES;
