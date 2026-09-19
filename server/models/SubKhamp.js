const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Sub-Khamp – fifth level in hierarchy:
 * Community → Vansh → Kul → Khamp → Sub-Khamp → Gotra.
 * Migrated from the former Gotra collection (same parent: khampId).
 */
const SubKhampSchema = new Schema(
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
    khampId: {
      type: Schema.Types.ObjectId,
      ref: "khamps",
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

SubKhampSchema.index({ khampId: 1, name: 1, isDeleted: 1 }, { unique: true });
SubKhampSchema.index({
  communityId: 1,
  vanshId: 1,
  kulId: 1,
  khampId: 1,
  isActive: 1,
  isDeleted: 1,
});

const SubKhamp = mongoose.model("subkhamps", SubKhampSchema);

module.exports = SubKhamp;
