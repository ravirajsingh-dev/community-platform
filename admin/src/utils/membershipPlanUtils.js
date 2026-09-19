export const slugifyPlanPart = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const generatePlanSlug = (name, price, durationType, durationValue) => {
  const parts = [
    slugifyPlanPart(name),
    slugifyPlanPart(price),
    slugifyPlanPart(durationType),
  ];

  if (durationType !== "lifetime") {
    parts.push(slugifyPlanPart(durationValue));
  }

  return parts.filter(Boolean).join("_").slice(0, 100);
};
