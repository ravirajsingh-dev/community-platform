export const createSectionId = () =>
  `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const emptyAboutSection = () => ({
  id: createSectionId(),
  heading: "",
  description: "",
  imageUrl: "",
  imageKey: "",
  image: null,
  imagePreview: null,
  clearImage: false,
});

export const normalizeAboutSectionsFromApi = (sections, legacy = {}) => {
  if (Array.isArray(sections) && sections.length > 0) {
    return sections.map((sec, index) => ({
      id: sec?.id || createSectionId(),
      heading: sec?.heading ?? "",
      description: sec?.description ?? "",
      imageUrl: sec?.imageUrl ?? "",
      imageKey: sec?.imageKey ?? "",
      image: null,
      imagePreview: sec?.imageUrl || null,
      clearImage: false,
      order: typeof sec?.order === "number" ? sec.order : index,
    }));
  }

  const legacySections = [];
  if (legacy.mission) {
    legacySections.push({
      id: createSectionId(),
      heading: "Our Mission",
      description: legacy.mission,
      imageUrl: "",
      imageKey: "",
      image: null,
      imagePreview: null,
      clearImage: false,
    });
  }
  if (legacy.vision) {
    legacySections.push({
      id: createSectionId(),
      heading: "Our Vision",
      description: legacy.vision,
      imageUrl: "",
      imageKey: "",
      image: null,
      imagePreview: null,
      clearImage: false,
    });
  }
  return legacySections.length > 0 ? legacySections : [emptyAboutSection()];
};

export const buildAboutUsFromSettings = (settings = {}) => ({
  title: settings.aboutUs?.title || "",
  intro:
    settings.aboutUs?.intro || settings.aboutUs?.description || "",
  sections: normalizeAboutSectionsFromApi(settings.aboutUs?.sections, {
    mission: settings.aboutUs?.mission,
    vision: settings.aboutUs?.vision,
  }),
});

export const buildContactUsPageFromSettings = (settings = {}) => ({
  title: settings.contactUsPage?.title || "",
  intro: settings.contactUsPage?.intro || "",
  phone: settings.contactUsPage?.phone || settings.contactUs || "",
  secondaryPhone: settings.contactUsPage?.secondaryPhone || "",
  email: settings.contactUsPage?.email || settings.email || "",
  address: settings.contactUsPage?.address || settings.address || "",
  businessHours: settings.contactUsPage?.businessHours || "",
});

export const appendAboutContactSubmitData = (submitData, formData) => {
  const aboutUsPayload = {
    title: formData.aboutUs.title,
    intro: formData.aboutUs.intro,
    sections: (formData.aboutUs.sections || []).map((sec, order) => ({
      id: sec.id,
      heading: sec.heading,
      description: sec.description,
      imageUrl: sec.clearImage ? "" : sec.imageUrl || "",
      imageKey: sec.clearImage ? "" : sec.imageKey || "",
      clearImage: Boolean(sec.clearImage),
      order,
    })),
  };
  submitData.append("aboutUs", JSON.stringify(aboutUsPayload));

  (formData.aboutUs.sections || []).forEach((sec) => {
    if (sec.image instanceof File) {
      submitData.append(`aboutUsSection_${sec.id}`, sec.image);
    }
  });

  submitData.append("contactUsPage", JSON.stringify(formData.contactUsPage));
};
