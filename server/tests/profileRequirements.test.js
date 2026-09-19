const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  PROFILE_USER_DETAILS_REQUIRED,
  getMatrimonialUserDetailsRequired,
  getProfileRequirementsResponse,
} = require("../config/profileRequirements");

describe("profileRequirements Phase 5 hierarchy", () => {
  it("requires gotra for general profile completion", () => {
    assert.ok(PROFILE_USER_DETAILS_REQUIRED.includes("subKhamp"));
    assert.ok(PROFILE_USER_DETAILS_REQUIRED.includes("gotra"));
    const subIdx = PROFILE_USER_DETAILS_REQUIRED.indexOf("subKhamp");
    const gotraIdx = PROFILE_USER_DETAILS_REQUIRED.indexOf("gotra");
    assert.ok(gotraIdx === subIdx + 1);
  });

  it("requires gotra for matrimonial apply", () => {
    const required = getMatrimonialUserDetailsRequired();
    assert.ok(required.includes("gotra"));
    assert.ok(required.includes("subKhamp"));
  });

  it("exposes gotra in profile-requirements API payload", () => {
    const payload = getProfileRequirementsResponse();
    assert.ok(payload.profile.userDetails.includes("gotra"));
    assert.ok(payload.matrimonial.userDetails.includes("gotra"));
    assert.equal(payload.fieldLabels.gotra, "Gotra");
    assert.equal(payload.fieldTabs.gotra, "community");
  });
});
