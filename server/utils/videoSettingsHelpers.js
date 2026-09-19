const normalizeVideoSettings = (video = {}) => {
  const raw = video?.toObject ? video.toObject() : video || {};

  return {
    title: raw.title?.trim() || "",
    description:
      typeof raw.description === "string"
        ? raw.description.replace(/\r\n/g, "\n")
        : "",
  };
};

module.exports = {
  normalizeVideoSettings,
};
