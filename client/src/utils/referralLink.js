export const getPortalBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_APP_PORTAL_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, "");
  }
  return window.location.origin;
};

export const buildReferralLink = (memberId) => {
  if (!memberId) return "";
  return `${getPortalBaseUrl()}/register?referralId=${encodeURIComponent(memberId)}`;
};
