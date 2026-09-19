const normalizeHeroSettings = (hero = {}) => {
  const raw = hero?.toObject ? hero.toObject() : hero || {};
  const buttons = Array.isArray(raw.buttons) ? raw.buttons : [];

  return {
    title: raw.title?.trim() || "",
    tagline:
      typeof raw.tagline === "string"
        ? raw.tagline.replace(/\r\n/g, "\n")
        : "",
    buttons: buttons
      .map((btn, index) => ({
        id:
          (typeof btn?.id === "string" && btn.id.trim()) ||
          `hero_btn_${Date.now()}_${index}`,
        label: String(btn?.label || "").trim(),
        path: String(btn?.path || "").trim(),
        variant: ["primary", "outline", "ghost"].includes(btn?.variant)
          ? btn.variant
          : "ghost",
        order: typeof btn?.order === "number" ? btn.order : index + 1,
      }))
      .filter((btn) => btn.label && btn.path)
      .sort((a, b) => a.order - b.order),
  };
};

module.exports = {
  normalizeHeroSettings,
};
