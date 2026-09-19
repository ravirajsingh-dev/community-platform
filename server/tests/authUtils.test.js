const { describe, it, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Session = require("../models/Session");
const {
  resolveSession,
  rotateRefreshToken,
} = require("../utils/authUtils");
const { JWT_REFRESH_SECRET } = require("../config/config");

describe("authUtils session resolution", () => {
  const userID = new mongoose.Types.ObjectId();
  const sessionID = "abc123session";
  let refreshToken;
  let sessionDoc;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    await Session.deleteMany({ sessionID });

    const payload = { id: userID.toString(), uuid: "test-uuid", role: 1 };
    refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "1d" });

    sessionDoc = await Session.create({
      userID,
      sessionID,
      accessToken: "access-token",
      refreshToken,
      role: 1,
      isActive: true,
    });
  });

  afterEach(async () => {
    await Session.deleteMany({ sessionID });
  });

  after(async () => {
    await mongoose.disconnect();
  });

  it("resolves an active session with a matching refresh token", async () => {
    const resolved = await resolveSession({ userID, sessionID, refreshToken });
    assert.ok(resolved);
    assert.equal(resolved.cookiesNeedSync, false);
  });

  it("accepts a stale refresh token shortly after rotation", async () => {
    const staleRefreshToken = refreshToken;
    const rotated = await rotateRefreshToken(
      { _id: userID, uuid: "test-uuid", role: 1 },
      sessionDoc,
      staleRefreshToken,
    );

    assert.equal(rotated.rotated, true);

    const resolved = await resolveSession({
      userID,
      sessionID,
      refreshToken: staleRefreshToken,
    });

    assert.ok(resolved);
    assert.equal(resolved.cookiesNeedSync, true);
    assert.equal(resolved.session.refreshToken, rotated.refreshToken);
  });
});
