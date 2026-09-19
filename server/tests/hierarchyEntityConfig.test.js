const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  HIERARCHY_ENTITIES,
  MASTER_DATA_ENTITIES,
  HIERARCHY_ENTITY_KEYS,
  MASTER_DATA_ENTITY_KEYS,
} = require("../config/hierarchyEntityConfig");

const REQUIRED_HIERARCHY_FIELDS = [
  "key",
  "label",
  "model",
  "listFilterParams",
  "duplicateScopeFields",
  "duplicateMessage",
  "listSuccessMessage",
  "exports",
  "cascade",
  "isLeaf",
  "cascadeOnActiveChange",
  "cascadeOnDelete",
  "userDetailsCleanup",
  "parentApprovalChain",
];

const REQUIRED_EXPORTS = [
  "create",
  "list",
  "getById",
  "update",
  "hardDelete",
  "approve",
  "reject",
  "bulkApprove",
];

const REQUIRED_MASTER_FIELDS = [
  "key",
  "label",
  "model",
  "duplicateScopeFields",
  "duplicateMessage",
  "listSuccessMessage",
  "createSuccessMessage",
  "nameRequiredMessage",
  "exports",
];

describe("hierarchyEntityConfig", () => {
  it("defines all six hierarchy entities", () => {
    assert.deepEqual(HIERARCHY_ENTITY_KEYS.sort(), [
      "community",
      "gotra",
      "khamp",
      "kul",
      "subKhamp",
      "vansh",
    ]);
  });

  it("defines all six master-data entities", () => {
    assert.deepEqual(MASTER_DATA_ENTITY_KEYS.sort(), [
      "community",
      "gotra",
      "khamp",
      "kul",
      "subKhamp",
      "vansh",
    ]);
  });

  for (const key of HIERARCHY_ENTITY_KEYS) {
    it(`hierarchy config '${key}' has required fields`, () => {
      const config = HIERARCHY_ENTITIES[key];
      for (const field of REQUIRED_HIERARCHY_FIELDS) {
        assert.ok(config[field] !== undefined, `missing ${field}`);
      }
      for (const exportKey of REQUIRED_EXPORTS) {
        assert.ok(
          typeof config.exports[exportKey] === "string",
          `missing export ${exportKey}`,
        );
      }
      assert.equal(
        Object.keys(config.exports).length,
        REQUIRED_EXPORTS.length,
        "unexpected extra exports",
      );
    });
  }

  it("gotra is leaf without delete cascade", () => {
    const gotra = HIERARCHY_ENTITIES.gotra;
    assert.equal(gotra.isLeaf, true);
    assert.equal(gotra.cascadeOnDelete, false);
    assert.equal(gotra.cascadeOnActiveChange, false);
    assert.equal(gotra.cascade.hardDelete, null);
  });

  it("subKhamp is leaf (Gotra hangs off Kul, not Sub-Khamp)", () => {
    const subKhamp = HIERARCHY_ENTITIES.subKhamp;
    assert.equal(subKhamp.isLeaf, true);
    assert.equal(subKhamp.cascadeOnDelete, false);
    assert.equal(subKhamp.cascadeOnActiveChange, false);
  });

  it("community is root without parent fields", () => {
    const community = HIERARCHY_ENTITIES.community;
    assert.deepEqual(community.adminParentFields, []);
    assert.deepEqual(community.duplicateScopeFields, []);
    assert.deepEqual(community.userDetailsCleanup.unsetFields, [
      "community",
      "vansh",
      "kul",
      "khamp",
      "subKhamp",
      "gotra",
    ]);
  });

  for (const key of MASTER_DATA_ENTITY_KEYS) {
    it(`master-data config '${key}' has required fields`, () => {
      const config = MASTER_DATA_ENTITIES[key];
      for (const field of REQUIRED_MASTER_FIELDS) {
        assert.ok(config[field] !== undefined, `missing ${field}`);
      }
      assert.ok(typeof config.exports.list === "string");
      assert.ok(typeof config.exports.create === "string");
    });
  }

  it("child master-data entities define parent query param", () => {
    for (const key of ["vansh", "kul", "khamp", "subKhamp", "gotra"]) {
      const config = MASTER_DATA_ENTITIES[key];
      assert.ok(config.parentQueryParam);
      assert.ok(config.parentBodyField);
      assert.ok(config.parentModel);
    }
  });

  it("gotra master-data parents to kul", () => {
    assert.equal(MASTER_DATA_ENTITIES.gotra.parentQueryParam, "kulId");
    assert.equal(MASTER_DATA_ENTITIES.subKhamp.parentQueryParam, "khampId");
  });
});
