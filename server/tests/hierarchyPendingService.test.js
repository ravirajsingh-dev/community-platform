const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildChainFromEntity,
  formatChainLabel,
  getAllowedLevels,
} = require("../utils/hierarchyPendingService");
const { HIERARCHY_ENTITIES } = require("../config/hierarchyEntityConfig");

describe("hierarchyPendingService", () => {
  it("buildChainFromEntity returns parent chain in root-to-leaf order", () => {
    const config = HIERARCHY_ENTITIES.kul;
    const entity = {
      name: "ABC",
      communityId: { _id: "c1", name: "JAT" },
      vanshId: { _id: "v1", name: "XYZ" },
    };

    const chain = buildChainFromEntity(config, entity);
    assert.deepEqual(chain, [
      { level: "community", field: "communityId", name: "JAT" },
      { level: "vansh", field: "vanshId", name: "XYZ" },
    ]);
  });

  it("formatChainLabel includes entity name at the end", () => {
    const chain = [
      { level: "community", name: "JAT" },
      { level: "vansh", name: "XYZ" },
    ];
    assert.equal(formatChainLabel(chain, "ABC"), "JAT → XYZ → ABC");
  });

  it("getAllowedLevels returns only modules with edit permission", () => {
    const userObj = {
      permissions: {
        communities: { list: true, edit: false },
        vansh: { list: true, edit: true },
        kul: false,
      },
    };

    assert.deepEqual(getAllowedLevels(userObj, "edit"), ["vansh"]);
  });
});
