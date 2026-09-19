export const SOCIAL_PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "zoom", label: "Zoom Meeting" },
  { value: "tiktok", label: "TikTok" },
];

export const createSocialLinkId = () =>
  `social_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const getUsedPlatforms = (socialLinks = [], excludeIndex = -1) =>
  socialLinks
    .filter((_, index) => index !== excludeIndex)
    .map((link) => link.platform);

export const getAvailablePlatformOptions = (socialLinks = [], currentIndex) => {
  const usedPlatforms = getUsedPlatforms(socialLinks, currentIndex);
  return SOCIAL_PLATFORM_OPTIONS.filter(
    (option) =>
      option.value === socialLinks[currentIndex]?.platform ||
      !usedPlatforms.includes(option.value),
  );
};

export const getNextAvailablePlatform = (socialLinks = []) => {
  const usedPlatforms = getUsedPlatforms(socialLinks);
  const next = SOCIAL_PLATFORM_OPTIONS.find(
    (option) => !usedPlatforms.includes(option.value),
  );
  return next?.value || null;
};

export const canAddSocialLink = (socialLinks = []) =>
  getNextAvailablePlatform(socialLinks) !== null;

export const emptySocialLink = (platform = "facebook") => ({
  id: createSocialLinkId(),
  platform,
  url: "",
  order: 0,
});

export const normalizeSocialLinksFromApi = (socialMedia = {}) => {
  if (Array.isArray(socialMedia.links) && socialMedia.links.length > 0) {
    return socialMedia.links.map((link, index) => ({
      id: link?.id || createSocialLinkId(),
      platform: link?.platform || "facebook",
      url: link?.url ?? "",
      order: typeof link?.order === "number" ? link.order : index,
    }));
  }

  const legacyMap = [
    ["facebook", socialMedia.facebook],
    ["instagram", socialMedia.instagram],
    ["youtube", socialMedia.youtube],
    ["zoom", socialMedia.zoomMeeting],
  ];

  const legacyLinks = legacyMap
    .filter(([, url]) => url && String(url).trim())
    .map(([platform, url], index) => ({
      id: createSocialLinkId(),
      platform,
      url: String(url).trim(),
      order: index,
    }));

  return legacyLinks.length > 0 ? legacyLinks : [emptySocialLink()];
};

export const validateSocialLinks = (links = []) => {
  const errors = [];
  links.forEach((link, index) => {
    if (!link.url || !String(link.url).trim()) {
      errors.push({
        path: `socialLinks.${index}.url`,
        msg: "Profile URL is required.",
      });
    }
  });
  return errors;
};

export const buildSocialMediaForSubmit = (links = []) => ({
  links: links
    .filter((link) => link.url && String(link.url).trim())
    .map((link, index) => ({
      id: link.id,
      platform: link.platform,
      url: String(link.url).trim(),
      order: index,
    })),
});
