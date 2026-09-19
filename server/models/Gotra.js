const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Gotra – depends on Kul (clan), not Khamp/Sub-Khamp.
 * Same Kul shares one Gotra set across all its Khamp / Sub-Khamp branches.
 *
 * Profile hierarchy chain still collects:
 * Community → Vansh → Kul → (Gotra from Kul) → Khamp → Sub-Khamp
 */
const GotraSchema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "communities",
      required: true,
      index: true,
    },
    vanshId: {
      type: Schema.Types.ObjectId,
      ref: "vanshes",
      required: true,
      index: true,
    },
    kulId: {
      type: Schema.Types.ObjectId,
      ref: "kuls",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "rejected"],
      default: "pending",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

GotraSchema.index({ kulId: 1, name: 1, isDeleted: 1 }, { unique: true });
GotraSchema.index({
  communityId: 1,
  vanshId: 1,
  kulId: 1,
  isActive: 1,
  isDeleted: 1,
});

const Gotra = mongoose.model("gotras", GotraSchema);

module.exports = Gotra;
