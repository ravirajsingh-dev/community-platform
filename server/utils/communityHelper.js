const mongoose = require("mongoose");
const Community = require("../models/Community");
const User = require("../models/User");
const UserDetails = require("../models/UserDetails");

/**
 * Validate that communityId is an active, non-deleted community.
 * @returns {{ communityId?: mongoose.Types.ObjectId, error?: { path: string, msg: string } }}
 */
async function resolveActiveCommunity(communityId) {
  if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
    return {
      error: {
        path: "community",
        msg: "Please select a valid community.",
      },
    };
  }

  const community = await Community.findOne({
    _id: communityId,
    isDeleted: false,
    isActive: true,
    status: "active",
  })
    .select("_id")
    .lean();

  if (!community) {
    return {
      error: {
        path: "community",
        msg: "Selected community is not available.",
      },
    };
  }

  return { communityId: community._id };
}

/**
 * Active communities for public registration dropdowns.
 */
async function listActiveCommunitiesForDropdown() {
  const records = await Community.find({
    isDeleted: false,
    isActive: true,
    status: "active",
  })
    .select("_id name status")
    .sort({ name: 1 })
    .lean();

  return records.map((record) => ({
    value: record._id.toString(),
    label: record.name,
    status: record.status || "active",
  }));
}

/**
 * Resolve the logged-in user's community (UserDetails first, then User.community).
 * @returns {Promise<mongoose.Types.ObjectId|null>}
 */
async function getUserCommunityId(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;

  const ud = await UserDetails.findOne({ userId })
    .select("community")
    .lean();
  if (ud?.community) {
    return ud.community;
  }

  const user = await User.findById(userId).select("community").lean();
  return user?.community || null;
}

/**
 * Normalize any community-like value to a comparable string id.
 */
function toCommunityIdString(value) {
  if (!value) return null;
  if (typeof value === "object") {
    const id = value._id ?? value.value ?? value;
    return id ? String(id) : null;
  }
  return String(value);
}

module.exports = {
  resolveActiveCommunity,
  listActiveCommunitiesForDropdown,
  getUserCommunityId,
  toCommunityIdString,
};
