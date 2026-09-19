const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  slugifyComingSoonLabel,
  sanitizeComingSoonMenuItems,
  normalizePublicComingSoon,
} = require("../utils/comingSoonHelpers");

describe("comingSoonHelpers", () => {
  it("slugifyComingSoonLabel normalizes labels", () => {
    assert.equal(slugifyComingSoonLabel("E-Voting"), "e-voting");
    assert.equal(slugifyComingSoonLabel("  Online  Polls!! "), "online-polls");
  });

  it("sanitizeComingSoonMenuItems drops empty labels and unique-ifies slugs", () => {
    const result = sanitizeComingSoonMenuItems([
      { label: "E-Voting", enabled: true },
      { label: "", slug: "skip-me" },
      { label: "E Voting", slug: "e-voting" },
      { label: "Polls", enabled: "false" },
    ]);

    assert.equal(result.length, 3);
    assert.equal(result[0].slug, "e-voting");
    assert.equal(result[1].slug, "e-voting-2");
    assert.equal(result[2].enabled, false);
  });

  it("normalizePublicComingSoon returns only enabled items when feature is on", () => {
    const publicData = normalizePublicComingSoon({
      enabled: true,
      title: "Soon",
      description: "Wait",
      menuItems: [
        { label: "A", slug: "a", enabled: true, order: 1 },
        { label: "B", slug: "b", enabled: false, order: 0 },
      ],
    });

    assert.equal(publicData.menuItems.length, 1);
    assert.equal(publicData.menuItems[0].label, "A");
    assert.equal(publicData.menuItems[0].slug, "a");
    assert.equal(publicData.menuItems[0].path, "/coming-soon/a");
  });

  it("normalizePublicComingSoon hides menu when disabled", () => {
    const publicData = normalizePublicComingSoon({
      enabled: false,
      menuItems: [{ label: "A", slug: "a", enabled: true }],
    });
    assert.deepEqual(publicData.menuItems, []);
  });
});
