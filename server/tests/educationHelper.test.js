const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_EDUCATIONS,
  EDUCATION_ITEM_MAX_LENGTH,
  toEducationArray,
  ensureEducationArray,
  validateEducationInput,
} = require("../utils/educationHelper");

describe("educationHelper", () => {
  describe("toEducationArray", () => {
    it("maps legacy string to one-item array", () => {
      assert.deepEqual(toEducationArray("mba"), ["mba"]);
    });

    it("maps empty values to []", () => {
      assert.deepEqual(toEducationArray(""), []);
      assert.deepEqual(toEducationArray(null), []);
      assert.deepEqual(toEducationArray(undefined), []);
      assert.deepEqual(toEducationArray([]), []);
    });

    it("trims and drops empty array items", () => {
      assert.deepEqual(toEducationArray([" btech ", "", "mba"]), [
        "btech",
        "mba",
      ]);
    });

    it("returns [] for unsupported types", () => {
      assert.deepEqual(toEducationArray(42), []);
      assert.deepEqual(toEducationArray({ degree: "mba" }), []);
    });
  });

  describe("ensureEducationArray", () => {
    it("normalizes string education on userDetails", () => {
      const ud = { education: "mba" };
      ensureEducationArray(ud);
      assert.deepEqual(ud.education, ["mba"]);
    });

    it("sets [] when education missing", () => {
      const ud = {};
      ensureEducationArray(ud);
      assert.deepEqual(ud.education, []);
    });

    it("returns null-ish input unchanged", () => {
      assert.equal(ensureEducationArray(null), null);
      assert.equal(ensureEducationArray(undefined), undefined);
    });
  });

  describe("validateEducationInput", () => {
    it("accepts legacy string", () => {
      const result = validateEducationInput("mba");
      assert.equal(result.ok, true);
      assert.deepEqual(result.value, ["mba"]);
    });

    it("accepts multiple allowed values and preserves order", () => {
      const result = validateEducationInput(["btech", "mba"]);
      assert.equal(result.ok, true);
      assert.deepEqual(result.value, ["btech", "mba"]);
    });

    it("accepts empty clear via [] / '' / null", () => {
      assert.deepEqual(validateEducationInput([]).value, []);
      assert.deepEqual(validateEducationInput("").value, []);
      assert.deepEqual(validateEducationInput(null).value, []);
    });

    it("rejects unknown value", () => {
      const result = validateEducationInput(["not_a_real_degree"]);
      assert.equal(result.ok, false);
      assert.equal(result.errors[0].path, "education[0]");
    });

    it("rejects unsupported types", () => {
      const result = validateEducationInput({ degree: "mba" });
      assert.equal(result.ok, false);
    });

    it("rejects duplicates", () => {
      const result = validateEducationInput(["mba", "mba"]);
      assert.equal(result.ok, false);
    });

    it("rejects more than max", () => {
      const degrees = ["btech", "bsc", "ba", "bcom", "bed", "llb"];
      assert.equal(degrees.length, MAX_EDUCATIONS + 1);
      const result = validateEducationInput(degrees);
      assert.equal(result.ok, false);
    });

    it("rejects oversized item string", () => {
      const long = "a".repeat(EDUCATION_ITEM_MAX_LENGTH + 1);
      // Bypass enum by only checking length path if we used a custom raw that becomes long item
      // Enum check runs after length — ensure length error wins for a long allowed-looking pad
      const result = validateEducationInput([long]);
      assert.equal(result.ok, false);
      assert.match(result.errors[0].msg, /at most/i);
    });
  });
});
