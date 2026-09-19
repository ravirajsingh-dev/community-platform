#!/usr/bin/env node
/**
 * One-off: backfill permanent Active referral counts.
 *
 * For each Active user (status=1) with a referralId who is not yet
 * referralCounted, marks them counted and increments the referrer's
 * referralCount. Safe to re-run (idempotent via referralCounted).
 *
 * Usage (from server/, with MONGO_URI in the environment):
 *   MONGO_URI="..." node scripts/backfillReferralCounts.js           # dry-run
 *   MONGO_URI="..." node scripts/backfillReferralCounts.js --apply   # write
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const {
  recordActiveReferralIfNeeded,
} = require("../utils/referralCountHelper");

const APPLY = process.argv.includes("--apply");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not defined in the environment");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const pending = await User.find({
    status: 1,
    referralId: { $type: "string", $ne: "" },
    referralCounted: { $ne: true },
  })
    .select("_id memberId referralId status referralCounted name")
    .lean();

  console.log(
    `Found ${pending.length} Active referred user(s) not yet counted.` +
      (APPLY
        ? " Applying backfill…"
        : " Dry-run only (pass --apply to write)."),
  );

  if (pending.length === 0) {
    await mongoose.disconnect();
    return;
  }

  let counted = 0;
  let skipped = 0;

  for (const row of pending) {
    if (!APPLY) {
      console.log(
        `  would count ${row.memberId} → referrer ${row.referralId}`,
      );
      counted += 1;
      continue;
    }

    const user = await User.findById(row._id);
    if (!user) {
      skipped += 1;
      continue;
    }

    const result = await recordActiveReferralIfNeeded(user);
    if (result.counted) {
      counted += 1;
      console.log(`  counted ${user.memberId} → referrer ${user.referralId}`);
    } else {
      skipped += 1;
      console.log(
        `  skipped ${user.memberId} (${result.reason || "unknown"})`,
      );
    }
  }

  console.log(
    APPLY
      ? `Done. counted=${counted}, skipped=${skipped}`
      : `Dry-run complete. would_count=${counted}`,
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
