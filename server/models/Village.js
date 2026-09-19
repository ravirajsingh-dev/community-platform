const mongoose = require("mongoose");
const { Schema } = mongoose;

const VillageSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    stateCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    cityId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    cityName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending", "rejected"],
      default: "pending",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VillageSchema.index({
  name: 1,
  countryCode: 1,
  stateCode: 1,
  cityId: 1,
});
VillageSchema.index({
  countryCode: 1,
  stateCode: 1,
  cityId: 1,
  status: 1,
});

const Village = mongoose.model("villages", VillageSchema);

module.exports = Village;
