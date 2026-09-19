const normalizeNewsSettings = (news = {}) => {
  const raw = news?.toObject ? news.toObject() : news || {};

  return {
    title: raw.title?.trim() || "",
    description:
      typeof raw.description === "string"
        ? raw.description.replace(/\r\n/g, "\n")
        : "",
  };
};

module.exports = {
  normalizeNewsSettings,
};
