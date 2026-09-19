var response = require("../../../config/response");
const CommonSettings = require("../../../models/CommonSettings");
const {
  normalizeSocialMediaLinks,
} = require("../../../utils/socialMediaHelpers");
const {
  normalizeHeroSettings,
} = require("../../../utils/heroSettingsHelpers");
const {
  listActiveCommunitiesForDropdown,
} = require("../../../utils/communityHelper");
const {
  normalizePublicComingSoon,
} = require("../../../utils/comingSoonHelpers");

const normalizePublicAboutUs = (aboutUs = {}) => {
  const raw = aboutUs?.toObject ? aboutUs.toObject() : aboutUs || {};
  const title = raw.title || "";
  const intro = raw.intro || raw.description || "";

  let sections = Array.isArray(raw.sections)
    ? raw.sections.map((sec, index) => ({
        id: sec?.id || `sec_${index}`,
        heading: sec?.heading || "",
        description: sec?.description || "",
        imageUrl: sec?.imageUrl || "",
        order: typeof sec?.order === "number" ? sec.order : index,
      }))
    : [];

  if (sections.length === 0 && (raw.mission || raw.vision || raw.description)) {
    const legacy = [];
    if (raw.mission) {
      legacy.push({
        id: "legacy-mission",
        heading: "Our Mission",
        description: raw.mission,
        imageUrl: "",
        order: 0,
      });
    }
    if (raw.vision) {
      legacy.push({
        id: "legacy-vision",
        heading: "Our Vision",
        description: raw.vision,
        imageUrl: "",
        order: legacy.length,
      });
    }
    sections = legacy;
  }

  sections.sort((a, b) => a.order - b.order);
  return { title, intro, sections };
};

const normalizePublicContactUs = (contactUsPage = {}, legacy = {}) => {
  const raw = contactUsPage?.toObject
    ? contactUsPage.toObject()
    : contactUsPage || {};
  return {
    title: raw.title || "",
    intro: raw.intro || "",
    phone: raw.phone || legacy.contactUs || "",
    secondaryPhone: raw.secondaryPhone || "",
    email: raw.email || legacy.email || "",
    address: raw.address || legacy.address || "",
    businessHours: raw.businessHours || "",
  };
};

const getPublicCommonSettings = async (req, res) => {
  try {
    const settings = await CommonSettings.getOrCreateSettings();
    const settingsObj = settings.toObject ? settings.toObject() : settings;

    const publicSettings = {
      name: settingsObj.name || "",
      abbreviation: settingsObj.abbreviation || "",
      developedBy: settingsObj.developedBy || "",
      developedByLink: settingsObj.developedByLink || "",
      logoUrl: settingsObj.logoUrl || "",
      socialMedia: {
        links: normalizeSocialMediaLinks(settingsObj.socialMedia),
      },
      aboutUs: normalizePublicAboutUs(settingsObj.aboutUs),
      contactUsPage: normalizePublicContactUs(
        settingsObj.contactUsPage,
        settingsObj,
      ),
      hero: normalizeHeroSettings(settingsObj.hero),
      comingSoon: normalizePublicComingSoon(settingsObj.comingSoon),
      loginEnabled: settingsObj.loginEnabled !== false,
      registerEnabled: settingsObj.registerEnabled !== false,
      paymentGateway: {
        enabled: settingsObj.paymentGateway?.enabled === true,
        provider: settingsObj.paymentGateway?.provider || "cashfree",
      },
    };

    return response.successResponse(
      res,
      publicSettings,
      "Public settings retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getPublicCommonSettings:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

const getPublicCommunities = async (req, res) => {
  try {
    const communities = await listActiveCommunitiesForDropdown();
    return response.successResponse(
      res,
      communities,
      "Communities retrieved successfully.",
    );
  } catch (err) {
    console.error("Error in getPublicCommunities:", err);
    return response.errorResponse(res, {}, "Server Error", 500);
  }
};

module.exports = {
  getPublicCommonSettings,
  getPublicCommunities,
};
