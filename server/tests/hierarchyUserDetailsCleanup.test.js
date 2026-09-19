const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  HIERARCHY_USER_DETAILS_CLEANUP,
} = require("../utils/hierarchyUserDetailsCleanup");

describe("hierarchyUserDetailsCleanup", () => {
  it("defines cascading unset fields per hierarchy level", () => {
    assert.deepEqual(HIERARCHY_USER_DETAILS_CLEANUP.community.unsetFields, [
      "community",
      "vansh",
      "kul",
      "khamp",
      "subKhamp",
      "gotra",
    ]);
    assert.deepEqual(HIERARCHY_USER_DETAILS_CLEANUP.vansh.unsetFields, [
      "vansh",
      "kul",
      "khamp",
      "subKhamp",
      "gotra",
    ]);
    assert.deepEqual(HIERARCHY_USER_DETAILS_CLEANUP.khamp.unsetFields, [
      "khamp",
      "subKhamp",
    ]);
    assert.deepEqual(HIERARCHY_USER_DETAILS_CLEANUP.subKhamp.unsetFields, [
      "subKhamp",
    ]);
    assert.deepEqual(HIERARCHY_USER_DETAILS_CLEANUP.gotra.unsetFields, [
      "gotra",
    ]);
  });

  it("matches userDetails field names on each entity", () => {
    assert.equal(HIERARCHY_USER_DETAILS_CLEANUP.community.matchField, "community");
    assert.equal(HIERARCHY_USER_DETAILS_CLEANUP.khamp.matchField, "khamp");
    assert.equal(HIERARCHY_USER_DETAILS_CLEANUP.subKhamp.matchField, "subKhamp");
  });
});
