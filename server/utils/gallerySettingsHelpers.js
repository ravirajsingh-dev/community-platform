const normalizeGallerySettings = (gallery = {}) => {
  const raw = gallery?.toObject ? gallery.toObject() : gallery || {};

  return {
    title: raw.title?.trim() || "",
    description:
      typeof raw.description === "string"
        ? raw.description.replace(/\r\n/g, "\n")
        : "",
  };
};

module.exports = {
  normalizeGallerySettings,
};
