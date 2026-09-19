const MAX_STEPS = 10;

const normalizeStep = (step = {}, index = 0) => ({
  id:
    typeof step.id === "string" && step.id.trim()
      ? step.id.trim()
      : `step_${index + 1}`,
  heading: typeof step.heading === "string" ? step.heading.trim() : "",
  description:
    typeof step.description === "string"
      ? step.description.replace(/\r\n/g, "\n").trim()
      : "",
  order: typeof step.order === "number" ? step.order : index,
});

const normalizeHowItWorksSettings = (howItWorks = {}) => {
  const raw = howItWorks?.toObject ? howItWorks.toObject() : howItWorks || {};

  let steps = Array.isArray(raw.steps)
    ? raw.steps.map((step, index) => normalizeStep(step, index))
    : [];

  steps.sort((a, b) => a.order - b.order);
  steps = steps.map((step, index) => ({ ...step, order: index }));

  return {
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    description:
      typeof raw.description === "string"
        ? raw.description.replace(/\r\n/g, "\n").trim()
        : "",
    steps,
  };
};

const validateHowItWorksPayload = (howItWorks = {}) => {
  const normalized = normalizeHowItWorksSettings(howItWorks);

  if (normalized.steps.length > MAX_STEPS) {
    throw new Error(`At most ${MAX_STEPS} steps are allowed`);
  }

  if (normalized.steps.length > 0) {
    if (!normalized.title) {
      throw new Error("Title is required when steps are added");
    }
    if (!normalized.description) {
      throw new Error("Short description is required when steps are added");
    }
  }

  normalized.steps.forEach((step, index) => {
    if (!step.heading) {
      throw new Error(`Step ${index + 1}: heading is required`);
    }
    if (!step.description) {
      throw new Error(`Step ${index + 1}: description is required`);
    }
  });

  return normalized;
};

module.exports = {
  MAX_STEPS,
  normalizeHowItWorksSettings,
  validateHowItWorksPayload,
};
