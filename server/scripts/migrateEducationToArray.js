#!/usr/bin/env node
/**
 * One-off: migrate UserDetails.education from legacy string → [string].
 *
 * Safe to re-run: only docs where typeof education === "string" are updated.
 * Empty / whitespace strings become [].
 *
 * Usage (from server/, with MONGO_URI in the environment):
 *   MONGO_URI="..." node scripts/migrateEducationToArray.js           # dry-run
 *   MONGO_URI="..." node scripts/migrateEducationToArray.js --apply   # write
 *
 * Or: npm run migrate:education-array / migrate:education-array:apply
 */

const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not defined in the environment");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.collection("user_details");

  const stringFilter = { education: { $type: "string" } };
  const count = await col.countDocuments(stringFilter);
  console.log(
    `Found ${count} user_details doc(s) with string education.` +
      (APPLY ? " Applying migration…" : " Dry-run only (pass --apply to write)."),
  );

  if (count === 0) {
    await mongoose.disconnect();
    return;
  }

  if (!APPLY) {
    const sample = await col
      .find(stringFilter, { projection: { _id: 1, education: 1 } })
      .limit(5)
      .toArray();
    console.log("Sample:", sample);
    await mongoose.disconnect();
    return;
  }

  const cursor = col.find(stringFilter);
  let updated = 0;
  let emptied = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const raw = doc.education;
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    const next = trimmed ? [trimmed] : [];
    await col.updateOne({ _id: doc._id }, { $set: { education: next } });
    updated += 1;
    if (next.length === 0) emptied += 1;
  }

  console.log(`Updated ${updated} doc(s) (${emptied} cleared to []).`);
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
