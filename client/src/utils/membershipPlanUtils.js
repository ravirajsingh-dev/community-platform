export const formatPlanDuration = (plan) => {
  if (!plan) return "";
  if (plan.durationType === "lifetime") return "Lifetime";
  const value = plan.durationValue;
  const type = plan.durationType || "months";
  const label = value === 1 ? type.replace(/s$/, "") : type;
  return `${value} ${label}`;
};

export const formatPlanPrice = (plan) => {
  if (!plan) return "";
  const currency = plan.currency || "INR";
  const formatted = Number(plan.price).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return currency === "INR" ? `₹${formatted}` : `${currency} ${formatted}`;
};
