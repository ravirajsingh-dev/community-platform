const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  ALL_HIERARCHY_CREATABLE_LEVELS,
  normalizeUserCreatableLevels,
  isUserCreatableLevel,
  buildHierarchySettingsResponse,
} = require("../utils/hierarchyCreatableSettings");

describe("hierarchyCreatableSettings", () => {
  it("defaults to all levels when setting is missing or empty", () => {
    assert.deepEqual(normalizeUserCreatableLevels(undefined), ALL_HIERARCHY_CREATABLE_LEVELS);
    assert.deepEqual(normalizeUserCreatableLevels([]), ALL_HIERARCHY_CREATABLE_LEVELS);
  });

  it("filters invalid levels and preserves valid order", () => {
    assert.deepEqual(
      normalizeUserCreatableLevels(["gotra", "invalid", "vansh", "vansh"]),
      ["gotra", "vansh"],
    );
  });

  it("isUserCreatableLevel respects normalized settings", () => {
    const levels = ["community", "vansh"];
    assert.equal(isUserCreatableLevel("community", levels), true);
    assert.equal(isUserCreatableLevel("gotra", levels), false);
  });

  it("buildHierarchySettingsResponse normalizes stored settings", () => {
    const response = buildHierarchySettingsResponse({
      userCreatableLevels: ["kul", "khamp"],
    });
    assert.deepEqual(response.userCreatableLevels, ["kul", "khamp"]);
  });
});
