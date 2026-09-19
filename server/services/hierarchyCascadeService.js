const Vansh = require("../models/Vansh");
const Kul = require("../models/Kul");
const Khamp = require("../models/Khamp");
const SubKhamp = require("../models/SubKhamp");
const Gotra = require("../models/Gotra");

/** Sub-Khamp only — Gotra hangs off Kul, not Khamp. */
async function hardDeleteUnderKhampIds(khampObjectIds, deleteOptions) {
  if (!khampObjectIds.length) return;
  await SubKhamp.deleteMany(
    { khampId: { $in: khampObjectIds } },
    deleteOptions,
  );
}

async function setActiveUnderKhampIds(khampObjectIds, isActive, updateOptions) {
  if (!khampObjectIds.length) return;
  await SubKhamp.updateMany(
    { khampId: { $in: khampObjectIds }, isDeleted: false },
    { $set: { isActive } },
    updateOptions,
  );
}

async function hardDeleteGotrasUnderKulIds(kulObjectIds, deleteOptions) {
  if (!kulObjectIds.length) return;
  await Gotra.deleteMany({ kulId: { $in: kulObjectIds } }, deleteOptions);
}

async function setActiveGotrasUnderKulIds(kulObjectIds, isActive, updateOptions) {
  if (!kulObjectIds.length) return;
  await Gotra.updateMany(
    { kulId: { $in: kulObjectIds }, isDeleted: false },
    { $set: { isActive } },
    updateOptions,
  );
}

const cascadeHardDeleteCommunity = async (communityId, session = null) => {
  const findQuery = Vansh.find({ communityId });
  if (session) findQuery.session(session);
  const vanshIds = await findQuery.select("_id").lean();

  const vanshObjectIds = vanshIds.map((v) => v._id);
  const deleteOptions = session ? { session } : {};

  if (vanshObjectIds.length > 0) {
    const kulFindQuery = Kul.find({ vanshId: { $in: vanshObjectIds } });
    if (session) kulFindQuery.session(session);
    const kulIds = await kulFindQuery.select("_id").lean();

    const kulObjectIds = kulIds.map((k) => k._id);

    if (kulObjectIds.length > 0) {
      await hardDeleteGotrasUnderKulIds(kulObjectIds, deleteOptions);

      const khampFindQuery = Khamp.find({ kulId: { $in: kulObjectIds } });
      if (session) khampFindQuery.session(session);
      const khampIds = await khampFindQuery.select("_id").lean();
      const khampObjectIds = khampIds.map((k) => k._id);

      await hardDeleteUnderKhampIds(khampObjectIds, deleteOptions);
      await Khamp.deleteMany({ kulId: { $in: kulObjectIds } }, deleteOptions);
    }

    await Kul.deleteMany({ vanshId: { $in: vanshObjectIds } }, deleteOptions);
  }

  await Vansh.deleteMany({ communityId }, deleteOptions);
};

const cascadeHardDeleteVansh = async (vanshId, session = null) => {
  const findQuery = Kul.find({ vanshId });
  if (session) findQuery.session(session);
  const kulIds = await findQuery.select("_id").lean();

  const kulObjectIds = kulIds.map((k) => k._id);
  const deleteOptions = session ? { session } : {};

  if (kulObjectIds.length > 0) {
    await hardDeleteGotrasUnderKulIds(kulObjectIds, deleteOptions);

    const khampFindQuery = Khamp.find({ kulId: { $in: kulObjectIds } });
    if (session) khampFindQuery.session(session);
    const khampIds = await khampFindQuery.select("_id").lean();
    const khampObjectIds = khampIds.map((k) => k._id);

    await hardDeleteUnderKhampIds(khampObjectIds, deleteOptions);
    await Khamp.deleteMany({ kulId: { $in: kulObjectIds } }, deleteOptions);
  }

  await Kul.deleteMany({ vanshId }, deleteOptions);
};

const cascadeHardDeleteKul = async (kulId, session = null) => {
  const findQuery = Khamp.find({ kulId });
  if (session) findQuery.session(session);
  const khampIds = await findQuery.select("_id").lean();
  const khampObjectIds = khampIds.map((k) => k._id);
  const deleteOptions = session ? { session } : {};

  await hardDeleteGotrasUnderKulIds([kulId], deleteOptions);
  await hardDeleteUnderKhampIds(khampObjectIds, deleteOptions);
  await Khamp.deleteMany({ kulId }, deleteOptions);
};

const cascadeHardDeleteKhamp = async (khampId, session = null) => {
  const deleteOptions = session ? { session } : {};
  await hardDeleteUnderKhampIds([khampId], deleteOptions);
};

/** Sub-Khamp is leaf — no child entities. */
const cascadeHardDeleteSubKhamp = async () => {};

const cascadeInactiveCommunity = async (communityId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Vansh.updateMany(
    { communityId, isDeleted: false },
    { $set: { isActive: false } },
    updateOptions,
  );

  const findQuery = Vansh.find({ communityId, isDeleted: false });
  if (session) findQuery.session(session);
  const vanshIds = await findQuery.select("_id").lean();

  const vanshObjectIds = vanshIds.map((v) => v._id);

  if (vanshObjectIds.length > 0) {
    await Kul.updateMany(
      { vanshId: { $in: vanshObjectIds }, isDeleted: false },
      { $set: { isActive: false } },
      updateOptions,
    );

    const kulFindQuery = Kul.find({
      vanshId: { $in: vanshObjectIds },
      isDeleted: false,
    });
    if (session) kulFindQuery.session(session);
    const kulIds = await kulFindQuery.select("_id").lean();

    const kulObjectIds = kulIds.map((k) => k._id);

    if (kulObjectIds.length > 0) {
      await setActiveGotrasUnderKulIds(kulObjectIds, false, updateOptions);

      const khampFindQuery = Khamp.find({
        kulId: { $in: kulObjectIds },
        isDeleted: false,
      });
      if (session) khampFindQuery.session(session);
      const khampIds = await khampFindQuery.select("_id").lean();
      const khampObjectIds = khampIds.map((k) => k._id);

      await Khamp.updateMany(
        { kulId: { $in: kulObjectIds }, isDeleted: false },
        { $set: { isActive: false } },
        updateOptions,
      );

      await setActiveUnderKhampIds(khampObjectIds, false, updateOptions);
    }
  }
};

const cascadeInactiveVansh = async (vanshId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Kul.updateMany(
    { vanshId, isDeleted: false },
    { $set: { isActive: false } },
    updateOptions,
  );

  const findQuery = Kul.find({ vanshId, isDeleted: false });
  if (session) findQuery.session(session);
  const kulIds = await findQuery.select("_id").lean();

  const kulObjectIds = kulIds.map((k) => k._id);

  if (kulObjectIds.length > 0) {
    await setActiveGotrasUnderKulIds(kulObjectIds, false, updateOptions);

    const khampFindQuery = Khamp.find({
      kulId: { $in: kulObjectIds },
      isDeleted: false,
    });
    if (session) khampFindQuery.session(session);
    const khampIds = await khampFindQuery.select("_id").lean();
    const khampObjectIds = khampIds.map((k) => k._id);

    await Khamp.updateMany(
      { kulId: { $in: kulObjectIds }, isDeleted: false },
      { $set: { isActive: false } },
      updateOptions,
    );

    await setActiveUnderKhampIds(khampObjectIds, false, updateOptions);
  }
};

const cascadeInactiveKul = async (kulId, session = null) => {
  const findQuery = Khamp.find({ kulId, isDeleted: false });
  if (session) findQuery.session(session);
  const khampIds = await findQuery.select("_id").lean();
  const khampObjectIds = khampIds.map((k) => k._id);
  const updateOptions = session ? { session } : {};

  await setActiveGotrasUnderKulIds([kulId], false, updateOptions);

  await Khamp.updateMany(
    { kulId, isDeleted: false },
    { $set: { isActive: false } },
    updateOptions,
  );

  await setActiveUnderKhampIds(khampObjectIds, false, updateOptions);
};

const cascadeInactiveKhamp = async (khampId, session = null) => {
  const updateOptions = session ? { session } : {};
  await setActiveUnderKhampIds([khampId], false, updateOptions);
};

const cascadeInactiveSubKhamp = async () => {};

const cascadeActiveCommunity = async (communityId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Vansh.updateMany(
    { communityId, isDeleted: false },
    { $set: { isActive: true } },
    updateOptions,
  );

  const findQuery = Vansh.find({ communityId, isDeleted: false });
  if (session) findQuery.session(session);
  const vanshIds = await findQuery.select("_id").lean();

  const vanshObjectIds = vanshIds.map((v) => v._id);

  if (vanshObjectIds.length > 0) {
    await Kul.updateMany(
      { vanshId: { $in: vanshObjectIds }, isDeleted: false },
      { $set: { isActive: true } },
      updateOptions,
    );

    const kulFindQuery = Kul.find({
      vanshId: { $in: vanshObjectIds },
      isDeleted: false,
    });
    if (session) kulFindQuery.session(session);
    const kulIds = await kulFindQuery.select("_id").lean();

    const kulObjectIds = kulIds.map((k) => k._id);

    if (kulObjectIds.length > 0) {
      await setActiveGotrasUnderKulIds(kulObjectIds, true, updateOptions);

      const khampFindQuery = Khamp.find({
        kulId: { $in: kulObjectIds },
        isDeleted: false,
      });
      if (session) khampFindQuery.session(session);
      const khampIds = await khampFindQuery.select("_id").lean();
      const khampObjectIds = khampIds.map((k) => k._id);

      await Khamp.updateMany(
        { kulId: { $in: kulObjectIds }, isDeleted: false },
        { $set: { isActive: true } },
        updateOptions,
      );

      await setActiveUnderKhampIds(khampObjectIds, true, updateOptions);
    }
  }
};

const cascadeActiveVansh = async (vanshId, session = null) => {
  const updateOptions = session ? { session } : {};
  await Kul.updateMany(
    { vanshId, isDeleted: false },
    { $set: { isActive: true } },
    updateOptions,
  );

  const findQuery = Kul.find({ vanshId, isDeleted: false });
  if (session) findQuery.session(session);
  const kulIds = await findQuery.select("_id").lean();

  const kulObjectIds = kulIds.map((k) => k._id);

  if (kulObjectIds.length > 0) {
    await setActiveGotrasUnderKulIds(kulObjectIds, true, updateOptions);

    const khampFindQuery = Khamp.find({
      kulId: { $in: kulObjectIds },
      isDeleted: false,
    });
    if (session) khampFindQuery.session(session);
    const khampIds = await khampFindQuery.select("_id").lean();
    const khampObjectIds = khampIds.map((k) => k._id);

    await Khamp.updateMany(
      { kulId: { $in: kulObjectIds }, isDeleted: false },
      { $set: { isActive: true } },
      updateOptions,
    );

    await setActiveUnderKhampIds(khampObjectIds, true, updateOptions);
  }
};

const cascadeActiveKul = async (kulId, session = null) => {
  const findQuery = Khamp.find({ kulId, isDeleted: false });
  if (session) findQuery.session(session);
  const khampIds = await findQuery.select("_id").lean();
  const khampObjectIds = khampIds.map((k) => k._id);
  const updateOptions = session ? { session } : {};

  await setActiveGotrasUnderKulIds([kulId], true, updateOptions);

  await Khamp.updateMany(
    { kulId, isDeleted: false },
    { $set: { isActive: true } },
    updateOptions,
  );

  await setActiveUnderKhampIds(khampObjectIds, true, updateOptions);
};

const cascadeActiveKhamp = async (khampId, session = null) => {
  const updateOptions = session ? { session } : {};
  await setActiveUnderKhampIds([khampId], true, updateOptions);
};

const cascadeActiveSubKhamp = async () => {};

module.exports = {
  cascadeHardDeleteCommunity,
  cascadeHardDeleteVansh,
  cascadeHardDeleteKul,
  cascadeHardDeleteKhamp,
  cascadeHardDeleteSubKhamp,
  cascadeInactiveCommunity,
  cascadeInactiveVansh,
  cascadeInactiveKul,
  cascadeInactiveKhamp,
  cascadeInactiveSubKhamp,
  cascadeActiveCommunity,
  cascadeActiveVansh,
  cascadeActiveKul,
  cascadeActiveKhamp,
  cascadeActiveSubKhamp,
};
