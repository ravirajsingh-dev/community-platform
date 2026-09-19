#!/usr/bin/env node
/**
 * Phase 0 read-only inventory for Community hierarchy migration
 * (Gotra → Sub-Khamp + new Gotra).
 *
 * Usage (from server/, with MONGO_URI in the environment):
 *   MONGO_URI="..." node scripts/inventoryHierarchyPhase0.js
 *   npm run inventory:hierarchy-phase0
 *
 * Never writes. Safe against local and prod.
 */

const mongoose = require("mongoose");

const HIERARCHY_COLLECTIONS = [
  "communities",
  "vanshes",
  "kuls",
  "khamps",
  "gotras",
];

async function countHierarchy(db, name) {
  const col = db.collection(name);
  return {
    total: await col.countDocuments({}),
    activeAlive: await col.countDocuments({
      isDeleted: false,
      status: "active",
    }),
    pendingAlive: await col.countDocuments({
      isDeleted: false,
      status: "pending",
    }),
    rejectedAlive: await col.countDocuments({
      isDeleted: false,
      status: "rejected",
    }),
    deleted: await col.countDocuments({ isDeleted: true }),
  };
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not defined in the environment");
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const collectionNames = (await db.listCollections().toArray()).map(
    (c) => c.name,
  );

  const hierarchyCounts = {};
  for (const name of HIERARCHY_COLLECTIONS) {
    hierarchyCounts[name] = collectionNames.includes(name)
      ? await countHierarchy(db, name)
      : null;
  }

  const ud = db.collection("user_details");
  const userDetails = {
    total: await ud.countDocuments({}),
    withGotra: await ud.countDocuments({
      gotra: { $exists: true, $ne: null },
    }),
    missingGotra: await ud.countDocuments({
      $or: [{ gotra: null }, { gotra: { $exists: false } }],
    }),
    withSubKhampAlready: await ud.countDocuments({
      subKhamp: { $exists: true, $ne: null },
    }),
  };

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
  userDetails.orphanOrDeletedGotraRef = orphanAgg[0]?.n || 0;

  let gotraMissingKhampParent = 0;
  if (collectionNames.includes("gotras")) {
    const missingParent = await db
      .collection("gotras")
      .aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: {
            from: "khamps",
            localField: "khampId",
            foreignField: "_id",
            as: "k",
          },
        },
        {
          $match: {
            $or: [{ k: { $size: 0 } }, { "k.isDeleted": true }],
          },
        },
        { $count: "n" },
      ])
      .toArray();
    gotraMissingKhampParent = missingParent[0]?.n || 0;
  }

  const gotraDocs = collectionNames.includes("gotras")
    ? await db
        .collection("gotras")
        .find(
          { isDeleted: false },
          { projection: { name: 1, status: 1, khampId: 1 } },
        )
        .toArray()
    : [];

  const khamps = collectionNames.includes("khamps")
    ? await db
        .collection("khamps")
        .find({ isDeleted: false }, { projection: { name: 1 } })
        .toArray()
    : [];
  const khampMap = Object.fromEntries(
    khamps.map((k) => [String(k._id), k.name]),
  );

  const usage = await ud
    .aggregate([
      { $match: { gotra: { $exists: true, $ne: null } } },
      { $group: { _id: "$gotra", n: { $sum: 1 } } },
    ])
    .toArray();
  const usageMap = Object.fromEntries(
    usage.map((u) => [String(u._id), u.n]),
  );

  const gotraSamples = gotraDocs.map((g) => ({
    name: g.name,
    status: g.status,
    khamp: khampMap[String(g.khampId)] || String(g.khampId),
    userDetailsCount: usageMap[String(g._id)] || 0,
  }));

  const creatableSettingsSample = await db
    .collection("common_settings")
    .find({}, { projection: { userCreatableLevels: 1 } })
    .limit(5)
    .toArray();

  const report = {
    inventoryAt: new Date().toISOString(),
    database: db.databaseName,
    hierarchyCounts,
    gotraSamples,
    userDetails,
    gotraMissingKhampParent,
    creatableSettingsSample,
    subkhampsExists: collectionNames.includes("subkhamps"),
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
