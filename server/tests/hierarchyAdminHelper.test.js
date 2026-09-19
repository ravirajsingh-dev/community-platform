const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { HIERARCHY_ENTITIES } = require("../config/hierarchyEntityConfig");
const {
  createHierarchyController,
  escapeRegex,
  normalizeName,
  parseIsActive,
  buildDuplicateQuery,
  applyHierarchyStatusUpdate,
  resolveCreateStatus,
} = require("../utils/hierarchyAdminHelper");

describe("hierarchyAdminHelper pure functions", () => {
  it("escapeRegex escapes special characters", () => {
    assert.equal(escapeRegex("A+B"), "A\\+B");
    assert.equal(escapeRegex("test.name"), "test\\.name");
  });

  it("normalizeName trims and uppercases", () => {
    assert.equal(normalizeName("  rajput  "), "RAJPUT");
  });

  it("parseIsActive handles booleans and strings", () => {
    assert.equal(parseIsActive(true), true);
    assert.equal(parseIsActive("true"), true);
    assert.equal(parseIsActive("false"), false);
    assert.equal(parseIsActive(undefined, false), false);
  });

  it("buildDuplicateQuery scopes by configured fields", () => {
    const config = HIERARCHY_ENTITIES.vansh;
    const query = buildDuplicateQuery(config, "TEST", { communityId: "abc" });
    assert.equal(query.isDeleted, false);
    assert.equal(query.communityId, "abc");
    assert.equal(query.name.$regex.source, "^TEST$");
    assert.equal(query.name.$regex.flags, "i");
  });

  it("buildDuplicateQuery excludes id when updating", () => {
    const config = HIERARCHY_ENTITIES.community;
    const query = buildDuplicateQuery(config, "TEST", {}, "entity-id");
    assert.deepEqual(query._id, { $ne: "entity-id" });
  });

  it("resolveCreateStatus maps inactive to isActive false", () => {
    const result = resolveCreateStatus("inactive", true);
    assert.equal(result.status, "active");
    assert.equal(result.isActive, false);
  });

  it("applyHierarchyStatusUpdate maps inactive without changing approval status", () => {
    const entity = { status: "active", isActive: true };
    const result = applyHierarchyStatusUpdate(entity, "inactive");
    assert.equal(entity.status, "active");
    assert.equal(entity.isActive, false);
    assert.equal(result.cascadeInactive, true);
  });

  it("applyHierarchyStatusUpdate rejects invalid status", () => {
    const entity = { status: "active", isActive: true };
    const result = applyHierarchyStatusUpdate(entity, "bogus");
    assert.ok(result.error);
  });
});

describe("createHierarchyController", () => {
  it("returns Village-pattern community export names", () => {
    const handlers = createHierarchyController(HIERARCHY_ENTITIES.community);
    const expected = HIERARCHY_ENTITIES.community.exports;

    for (const handlerName of Object.values(expected)) {
      assert.equal(typeof handlers[handlerName], "function", handlerName);
    }

    assert.equal(Object.keys(handlers).length, 8);
  });

  it("returns Village-pattern subKhamp export names", () => {
    const handlers = createHierarchyController(HIERARCHY_ENTITIES.subKhamp);
    const expected = HIERARCHY_ENTITIES.subKhamp.exports;

    for (const handlerName of Object.values(expected)) {
      assert.equal(typeof handlers[handlerName], "function", handlerName);
    }

    assert.equal(Object.keys(handlers).length, 8);
  });

  it("returns Village-pattern gotra export names", () => {
    const handlers = createHierarchyController(HIERARCHY_ENTITIES.gotra);
    const expected = HIERARCHY_ENTITIES.gotra.exports;

    for (const handlerName of Object.values(expected)) {
      assert.equal(typeof handlers[handlerName], "function", handlerName);
    }

    assert.equal(Object.keys(handlers).length, 8);
  });

  it("returns bulk approve handler for gotra", () => {
    const handlers = createHierarchyController(HIERARCHY_ENTITIES.gotra);
    assert.equal(typeof handlers.bulkApproveGotra, "function");
  });
});
