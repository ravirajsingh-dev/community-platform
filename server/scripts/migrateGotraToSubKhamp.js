#!/usr/bin/env node
/**
 * Phase 2: migrate legacy Gotra documents → Sub-Khamp, then leave gotras empty
 * for the new leaf level under Sub-Khamp.
 *
 * Steps:
 *  1. Backup gotras / user_details / common_settings (JSON) unless --skip-backup
 *  2. Copy legacy gotras (no subKhampId) → subkhamps (same _id)
 *  3. Remap UserDetails.gotra → UserDetails.subKhamp; unset gotra
 *  4. Delete migrated docs from gotras (leave real new gotras if any)
 *  5. Ensure subkhamps + gotras indexes
 *  6. Patch common_settings.userCreatableLevels (insert subKhamp before gotra)
 *  7. Bootstrap sub_admins permissions: copy gotra → subKhamp when missing
 *
 * Usage (from server/, with MONGO_URI in the environment):
 *   MONGO_URI="..." node scripts/migrateGotraToSubKhamp.js              # dry-run
 *   MONGO_URI="..." node scripts/migrateGotraToSubKhamp.js --apply      # write
 *   MONGO_URI="..." node scripts/migrateGotraToSubKhamp.js --apply --skip-backup
 *
 * Or: npm run migrate:gotra-to-subkhamp / migrate:gotra-to-subkhamp:apply
 *
 * Safe to re-run: already-migrated docs are skipped.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");
const SKIP_BACKUP = process.argv.includes("--skip-backup");

const DEFAULT_BACKUP_ROOT = path.resolve(
  __dirname,
  "../../../backups/rsf-hierarchy",
);

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function createIndexSafe(collection, keys, options = {}) {
  try {
    await collection.createIndex(keys, options);
  } catch (err) {
    // Index already exists under another name, or equivalent options.
    if (err?.code === 85 || err?.code === 86 || err?.codeName === "IndexOptionsConflict") {
      console.warn(
        `Index ensure skipped (${collection.collectionName}): ${err.message}`,
      );
      return;
    }
    throw err;
  }
}

async function ensureIndexes(db) {
  const sub = db.collection("subkhamps");
  const gotra = db.collection("gotras");

  await createIndexSafe(
    sub,
    { khampId: 1, name: 1, isDeleted: 1 },
    { unique: true },
  );
  await createIndexSafe(sub, {
    communityId: 1,
    vanshId: 1,
    kulId: 1,
    khampId: 1,
    isActive: 1,
    isDeleted: 1,
  });

  await createIndexSafe(
    gotra,
    { subKhampId: 1, name: 1, isDeleted: 1 },
    { unique: true },
  );
  await createIndexSafe(gotra, {
    communityId: 1,
    vanshId: 1,
    kulId: 1,
    khampId: 1,
    subKhampId: 1,
    isActive: 1,
    isDeleted: 1,
  });
}

function patchCreatableLevels(levels) {
  if (!Array.isArray(levels)) return null;
  const next = [...levels];
  const hasSub = next.includes("subKhamp");
  const gotraIdx = next.indexOf("gotra");

  if (!hasSub) {
    if (gotraIdx >= 0) next.splice(gotraIdx, 0, "subKhamp");
    else next.push("subKhamp");
  }

  if (!next.includes("gotra")) next.push("gotra");

  // unchanged?
  if (
    next.length === levels.length &&
    next.every((v, i) => v === levels[i])
  ) {
    return null;
  }
  return next;
}

async function writeBackup(db, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });
  const collections = ["gotras", "user_details", "common_settings", "sub_admins"];
  const meta = {
    database: db.databaseName,
    backedUpAt: new Date().toISOString(),
    collections: {},
  };

  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const file = path.join(backupDir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(docs, null, 2));
    meta.collections[name] = { count: docs.length, file: path.basename(file) };
  }

  fs.writeFileSync(
    path.join(backupDir, "meta.json"),
    JSON.stringify(meta, null, 2),
  );
  return meta;
}

async function collectStats(db) {
  const gotras = db.collection("gotras");
  const subkhamps = db.collection("subkhamps");
  const ud = db.collection("user_details");

  const legacyGotraFilter = {
    $or: [
      { subKhampId: { $exists: false } },
      { subKhampId: null },
    ],
  };
  const newGotraFilter = { subKhampId: { $exists: true, $ne: null } };

  const legacyGotras = await gotras.countDocuments(legacyGotraFilter);
  const newShapeGotras = await gotras.countDocuments(newGotraFilter);
  const subKhampCount = await subkhamps.countDocuments({});
  const udWithGotra = await ud.countDocuments({
    gotra: { $exists: true, $ne: null },
  });
  const udWithSubKhamp = await ud.countDocuments({
    subKhamp: { $exists: true, $ne: null },
  });

  // UserDetails.gotra pointing at a doc that is NOT in subkhamps and NOT a new-shape gotra
  const orphanGotraRefs = await ud
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
        $lookup: {
          from: "subkhamps",
          localField: "gotra",
          foreignField: "_id",
          as: "s",
        },
      },
      {
        $match: {
          g: { $size: 0 },
          s: { $size: 0 },
        },
      },
      { $count: "n" },
    ])
    .toArray();

  const settings = await db
    .collection("common_settings")
    .find({}, { projection: { userCreatableLevels: 1 } })
    .toArray();

  const settingsNeedingPatch = settings.filter(
    (doc) => patchCreatableLevels(doc.userCreatableLevels || []) !== null,
  ).length;

  const subAdminsNeedingPerm = await db.collection("sub_admins").countDocuments({
    $and: [
      {
        $or: [
          { "permissions.gotra": { $exists: true } },
          { permissions: true },
        ],
      },
      { "permissions.subKhamp": { $exists: false } },
    ],
  });

  return {
    legacyGotras,
    newShapeGotras,
    subKhampCount,
    udWithGotra,
    udWithSubKhamp,
    orphanGotraRefs: orphanGotraRefs[0]?.n || 0,
    settingsNeedingPatch,
    subAdminsNeedingPerm,
  };
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not defined in the environment");
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;

  console.log(`Database: ${db.databaseName}`);
  console.log(
    APPLY
      ? "Mode: APPLY (writes enabled)"
      : "Mode: DRY-RUN (pass --apply to write)",
  );

  const before = await collectStats(db);
  console.log("\nBefore:", JSON.stringify(before, null, 2));

  if (before.orphanGotraRefs > 0) {
    console.error(
      `\nABORT: ${before.orphanGotraRefs} UserDetails.gotra ref(s) point to missing docs.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const legacyDocs = await db
    .collection("gotras")
    .find({
      $or: [{ subKhampId: { $exists: false } }, { subKhampId: null }],
    })
    .toArray();

  const udToRemap = await db
    .collection("user_details")
    .find({ gotra: { $exists: true, $ne: null } })
    .project({ _id: 1, gotra: 1, subKhamp: 1 })
    .toArray();

  console.log(`\nLegacy gotra docs to move → subkhamps: ${legacyDocs.length}`);
  console.log(
    `UserDetails rows with gotra to remap: ${udToRemap.length}`,
  );
  if (legacyDocs.length) {
    console.log(
      "Sample legacy names:",
      legacyDocs.slice(0, 5).map((d) => d.name),
    );
  }

  if (!APPLY) {
    console.log("\nDry-run complete. No changes written.");
    await mongoose.disconnect();
    return;
  }

  const backupRoot =
    process.env.HIERARCHY_BACKUP_DIR || DEFAULT_BACKUP_ROOT;
  const backupDir = path.join(
    backupRoot,
    `${db.databaseName}-pre-subkhamp-${stamp()}`,
  );

  if (!SKIP_BACKUP) {
    console.log(`\nWriting JSON backup → ${backupDir}`);
    const meta = await writeBackup(db, backupDir);
    console.log("Backup meta:", JSON.stringify(meta, null, 2));
  } else {
    console.log("\nSkipping backup (--skip-backup)");
  }

  let insertedSub = 0;
  let skippedSub = 0;
  for (const doc of legacyDocs) {
    const existing = await db.collection("subkhamps").findOne({ _id: doc._id });
    if (existing) {
      skippedSub += 1;
      continue;
    }
    const { subKhampId: _drop, ...rest } = doc;
    await db.collection("subkhamps").insertOne(rest);
    insertedSub += 1;
  }
  console.log(
    `\nSubKhamp insert: ${insertedSub} new, ${skippedSub} already present`,
  );

  let remapped = 0;
  let remappedSkipped = 0;
  for (const row of udToRemap) {
    // If subKhamp already set to a different id, only unset gotra when gotra
    // equals an existing subkhamp (legacy). Prefer not to overwrite subKhamp.
    const gotraId = row.gotra;
    const subExists = await db.collection("subkhamps").findOne({
      _id: gotraId,
    });

    if (!subExists && row.subKhamp) {
      // gotra may already be a real new-shape gotra; just unset if it still
      // points at legacy missing id — otherwise leave for manual review.
      remappedSkipped += 1;
      continue;
    }

    const update = { $unset: { gotra: "" } };
    if (!row.subKhamp && subExists) {
      update.$set = { subKhamp: gotraId };
    } else if (!row.subKhamp && !subExists) {
      // Should not happen after orphan check + insert; fail loud
      throw new Error(
        `UserDetails ${row._id} gotra ${gotraId} not found in subkhamps after copy`,
      );
    }

    await db.collection("user_details").updateOne({ _id: row._id }, update);
    remapped += 1;
  }
  console.log(
    `UserDetails remapped: ${remapped} (skipped ${remappedSkipped})`,
  );

  const deleteResult = await db.collection("gotras").deleteMany({
    $or: [{ subKhampId: { $exists: false } }, { subKhampId: null }],
  });
  console.log(`Deleted legacy gotras: ${deleteResult.deletedCount}`);

  // Drop obsolete unique index on gotras (khampId, name) if present
  try {
    await db.collection("gotras").dropIndex("khampId_1_name_1_isDeleted_1");
    console.log("Dropped obsolete gotras index khampId_1_name_1_isDeleted_1");
  } catch (err) {
    if (err?.codeName !== "IndexNotFound" && err?.code !== 27) {
      console.warn("dropIndex warning:", err.message);
    }
  }

  await ensureIndexes(db);
  console.log("Ensured subkhamps + gotras indexes");

  const settings = await db.collection("common_settings").find({}).toArray();
  let settingsPatched = 0;
  for (const doc of settings) {
    const next = patchCreatableLevels(doc.userCreatableLevels || []);
    if (!next) continue;
    await db
      .collection("common_settings")
      .updateOne({ _id: doc._id }, { $set: { userCreatableLevels: next } });
    settingsPatched += 1;
    console.log(
      `Patched settings ${doc._id}:`,
      doc.userCreatableLevels,
      "→",
      next,
    );
  }
  console.log(`Settings patched: ${settingsPatched}`);

  // Permission bootstrap: copy gotra module → subKhamp when missing
  const subAdmins = await db
    .collection("sub_admins")
    .find({
      "permissions.gotra": { $exists: true },
      "permissions.subKhamp": { $exists: false },
    })
    .toArray();
  let permsPatched = 0;
  for (const admin of subAdmins) {
    await db.collection("sub_admins").updateOne(
      { _id: admin._id },
      { $set: { "permissions.subKhamp": admin.permissions.gotra } },
    );
    permsPatched += 1;
  }
  console.log(`Sub-admin permissions bootstrapped: ${permsPatched}`);

  const after = await collectStats(db);
  console.log("\nAfter:", JSON.stringify(after, null, 2));

  const remainingLegacy = after.legacyGotras;
  const stillPointingGotraAtSub = await db
    .collection("user_details")
    .aggregate([
      { $match: { gotra: { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: "subkhamps",
          localField: "gotra",
          foreignField: "_id",
          as: "s",
        },
      },
      { $match: { "s.0": { $exists: true } } },
      { $count: "n" },
    ])
    .toArray();

  const badPointers = stillPointingGotraAtSub[0]?.n || 0;

  if (remainingLegacy > 0 || badPointers > 0) {
    console.error(
      `\nVERIFY FAILED: legacyGotras=${remainingLegacy}, gotraStillPointsAtSubKhamp=${badPointers}`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("\nPhase 2 migration applied successfully.");
  if (!SKIP_BACKUP) {
    console.log(`Backup kept at: ${backupDir}`);
  }
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
