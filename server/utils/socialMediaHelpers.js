const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "youtube",
  "twitter",
  "linkedin",
  "whatsapp",
  "telegram",
  "zoom",
  "tiktok",
];

const LEGACY_PLATFORM_MAP = {
  facebook: "facebook",
  instagram: "instagram",
  youtube: "youtube",
  zoomMeeting: "zoom",
};

const normalizeLink = (link, index) => ({
  id: String(link?.id || "").trim() || `link_${index}`,
  platform: String(link?.platform || "facebook").trim().toLowerCase(),
  url: String(link?.url || "").trim(),
  order: typeof link?.order === "number" ? link.order : index,
});

const normalizeSocialMediaLinks = (socialMedia = {}) => {
  const raw = socialMedia?.toObject ? socialMedia.toObject() : socialMedia || {};

  if (Array.isArray(raw.links) && raw.links.length > 0) {
    return raw.links
      .map(normalizeLink)
      .filter((link) => link.url)
      .sort((a, b) => a.order - b.order);
  }

  const legacyLinks = [];
  Object.entries(LEGACY_PLATFORM_MAP).forEach(([legacyKey, platform]) => {
    const url = raw[legacyKey];
    if (url && String(url).trim()) {
      legacyLinks.push({
        id: `legacy-${platform}`,
        platform,
        url: String(url).trim(),
        order: legacyLinks.length,
      });
    }
  });

  return legacyLinks;
};

const sanitizeSocialMediaLinks = (links = []) => {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((link, index) => {
      const platform = String(link?.platform || "facebook")
        .trim()
        .toLowerCase();
      const url = String(link?.url || "").trim();
      if (!url) {
        return null;
      }
      return {
        id: String(link?.id || "").trim() || `link_${Date.now()}_${index}`,
        platform: SOCIAL_PLATFORMS.includes(platform) ? platform : "facebook",
        url,
        order: index,
      };
    })
    .filter(Boolean);
};

const sanitizeSocialMediaPayload = (socialMedia = {}) => {
  if (Array.isArray(socialMedia.links)) {
    return { links: sanitizeSocialMediaLinks(socialMedia.links) };
  }
  return null;
};

module.exports = {
  SOCIAL_PLATFORMS,
  normalizeSocialMediaLinks,
  sanitizeSocialMediaLinks,
  sanitizeSocialMediaPayload,
};
