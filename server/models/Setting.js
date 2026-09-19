const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: Object,
      required: true,
    },
  },
  { timestamps: true }
);

const Setting = mongoose.model("settings", SettingSchema);
module.exports = Setting;

const saveSetting = async (key, value) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, returnDocument: "after" }
    ).lean();

    if (!setting._id) {
      return false;
    }

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const getSetting = async (key) => {
  try {
    const setting = await Setting.findOne({ key }).select("key value").lean();

    if (!setting) return null;

    return setting.value;
  } catch (err) {
    console.error(err);
    return null;
  }
};

module.exports.saveSetting = saveSetting;
module.exports.getSetting = getSetting;
