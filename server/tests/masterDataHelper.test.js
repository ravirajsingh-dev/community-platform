const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { MASTER_DATA_ENTITIES } = require("../config/hierarchyEntityConfig");
const {
  createMasterDataHandlers,
  buildUserDropdownQuery,
  toDropdownOptions,
  buildDuplicateQuery,
} = require("../utils/masterDataHelper");
const {
  normalizeUserCreatableLevels,
  isUserCreatableLevel,
} = require("../utils/hierarchyCreatableSettings");

describe("masterDataHelper", () => {
  it("buildUserDropdownQuery includes active and user pending records", () => {
    const config = MASTER_DATA_ENTITIES.community;
    const query = buildUserDropdownQuery(config, "user-1");
    assert.equal(query.isDeleted, false);
    assert.equal(query.$or.length, 4);
    assert.deepEqual(query.$or[1], {
      status: "pending",
      createdBy: "user-1",
    });
  });

  it("buildUserDropdownQuery scopes child entities by parent", () => {
    const config = MASTER_DATA_ENTITIES.vansh;
    const query = buildUserDropdownQuery(config, "user-1", "community-1");
    assert.equal(query.communityId, "community-1");
  });

  it("toDropdownOptions marks pending items", () => {
    const options = toDropdownOptions([
      { _id: "1", name: "RAJPUT", status: "active" },
      { _id: "2", name: "NEW", status: "pending" },
    ]);
    assert.equal(options[0].label, "RAJPUT");
    assert.equal(options[1].label, "NEW (Pending Admin Approval)");
  });

  it("buildDuplicateQuery applies scope fields", () => {
    const config = MASTER_DATA_ENTITIES.kul;
    const query = buildDuplicateQuery(config, "KUL1", { vanshId: "v1" });
    assert.equal(query.vanshId, "v1");
  });

  it("createMasterDataHandlers exports all list and create handlers", () => {
    const handlers = createMasterDataHandlers(MASTER_DATA_ENTITIES);
    const expectedNames = Object.values(MASTER_DATA_ENTITIES).flatMap((c) => [
      c.exports.list,
      c.exports.create,
    ]);

    for (const name of expectedNames) {
      assert.equal(typeof handlers[name], "function", name);
    }

    assert.equal(Object.keys(handlers).length, 12);
  });

  it("user create gate blocks levels not in admin settings", () => {
    const levels = normalizeUserCreatableLevels([
      "community",
      "vansh",
      "kul",
      "khamp",
    ]);
    assert.equal(isUserCreatableLevel("gotra", levels), false);
    assert.equal(isUserCreatableLevel("khamp", levels), true);
  });
});
