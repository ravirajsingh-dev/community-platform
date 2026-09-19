#!/usr/bin/env node
/**
 * Phase 5 read-only report: users missing Gotra (and related hierarchy coverage).
 *
 * Usage (from server/, with MONGO_URI in the environment):
 *   MONGO_URI="..." node scripts/reportUsersMissingGotra.js
 *   npm run report:users-missing-gotra
 *
 * Never writes. Safe against local and prod.
 */

const mongoose = require("mongoose");

async function countAlive(col) {
  return col.countDocuments({ isDeleted: false });
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not defined in the environment");
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const names = (await db.listCollections().toArray()).map((c) => c.name);

  const gotras = names.includes("gotras") ? db.collection("gotras") : null;
  const subkhamps = names.includes("subkhamps")
    ? db.collection("subkhamps")
    : null;
  const ud = db.collection("user_details");

  const gotraCounts = gotras
    ? {
        total: await gotras.countDocuments({}),
        alive: await countAlive(gotras),
        active: await gotras.countDocuments({
          isDeleted: false,
          status: "active",
        }),
        pending: await gotras.countDocuments({
          isDeleted: false,
          status: "pending",
        }),
      }
    : null;

  const subKhampCounts = subkhamps
    ? {
        total: await subkhamps.countDocuments({}),
        alive: await countAlive(subkhamps),
        active: await subkhamps.countDocuments({
          isDeleted: false,
          status: "active",
        }),
      }
    : null;

  const missingGotraFilter = {
    $or: [{ gotra: null }, { gotra: { $exists: false } }],
  };

  const withSubKhampMissingGotra = await ud.countDocuments({
    subKhamp: { $exists: true, $ne: null },
    ...missingGotraFilter,
  });

  const orphanAgg = await ud
    .aggregate([
      { $match: { gotra: { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: "gotras",
          localField: "gotra",
          foreignField: "_id",
          as: "g",
        },
      },
      {
        $match: {
          $or: [{ g: { $size: 0 } }, { "g.isDeleted": true }],
        },
      },
      { $count: "n" },
    ])
    .toArray();

  const sampleMissing = await ud
    .aggregate([
      {
        $match: {
          subKhamp: { $exists: true, $ne: null },
          ...missingGotraFilter,
        },
      },
      { $limit: 25 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "subkhamps",
          localField: "subKhamp",
          foreignField: "_id",
          as: "sk",
        },
      },
      {
        $project: {
          userId: 1,
          phone: { $arrayElemAt: ["$user.phone", 0] },
          name: { $arrayElemAt: ["$user.name", 0] },
          subKhamp: 1,
          subKhampName: { $arrayElemAt: ["$sk.name", 0] },
        },
      },
    ])
    .toArray();

  const bySubKhamp = await ud
    .aggregate([
      {
        $match: {
          subKhamp: { $exists: true, $ne: null },
          ...missingGotraFilter,
        },
      },
      { $group: { _id: "$subKhamp", usersMissingGotra: { $sum: 1 } } },
      { $sort: { usersMissingGotra: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "subkhamps",
          localField: "_id",
          foreignField: "_id",
          as: "sk",
        },
      },
      {
        $project: {
          subKhampId: "$_id",
          subKhampName: { $arrayElemAt: ["$sk.name", 0] },
          usersMissingGotra: 1,
          _id: 0,
        },
      },
    ])
    .toArray();

  const report = {
    reportedAt: new Date().toISOString(),
    database: db.databaseName,
    gotraCounts,
    subKhampCounts,
    userDetails: {
      total: await ud.countDocuments({}),
      withGotra: await ud.countDocuments({
        gotra: { $exists: true, $ne: null },
      }),
      missingGotra: await ud.countDocuments(missingGotraFilter),
      withSubKhamp: await ud.countDocuments({
        subKhamp: { $exists: true, $ne: null },
      }),
      withSubKhampMissingGotra,
      orphanOrDeletedGotraRef: orphanAgg[0]?.n || 0,
    },
    missingGotraBySubKhamp: bySubKhamp,
    sampleUsersMissingGotra: sampleMissing,
    notes: [
      "Phase 5 makes Gotra required for profile completion.",
      "Admin should create real Gotras under each Sub-Khamp before/while users update profiles.",
      "Old Gotra data was migrated to Sub-Khamp in Phase 2 — do not re-label Sub-Khamp as Gotra.",
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
