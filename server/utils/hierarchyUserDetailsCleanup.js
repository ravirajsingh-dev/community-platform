const UserDetails = require("../models/UserDetails");

const HIERARCHY_USER_DETAILS_CLEANUP = {
  community: {
    matchField: "community",
    unsetFields: ["community", "vansh", "kul", "khamp", "subKhamp", "gotra"],
  },
  vansh: {
    matchField: "vansh",
    unsetFields: ["vansh", "kul", "khamp", "subKhamp", "gotra"],
  },
  kul: {
    matchField: "kul",
    unsetFields: ["kul", "khamp", "subKhamp", "gotra"],
  },
  khamp: {
    matchField: "khamp",
    unsetFields: ["khamp", "subKhamp"],
  },
  subKhamp: {
    matchField: "subKhamp",
    unsetFields: ["subKhamp"],
  },
  gotra: {
    matchField: "gotra",
    unsetFields: ["gotra"],
  },
};

async function cleanupUserDetailsRefs(config, entityId) {
  const cleanup = config.userDetailsCleanup;
  if (!cleanup) return;

  const { matchField, unsetFields } = cleanup;
  const linkedCount = await UserDetails.countDocuments({
    [matchField]: entityId,
  });

  if (linkedCount === 0) return;

  const unsetPayload = {};
  for (const field of unsetFields) {
    unsetPayload[field] = "";
  }

  await UserDetails.updateMany(
    { [matchField]: entityId },
    { $unset: unsetPayload },
  );
}

module.exports = {
  HIERARCHY_USER_DETAILS_CLEANUP,
  cleanupUserDetailsRefs,
};
