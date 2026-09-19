import api from "@src/utils/axiosSetup";

const DEFAULT_PAGE_SIZE = 12;

export const getGallerySettings = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/gallery/settings`, config);
    return res.data && res.data.status === true ? res.data.response : null;
  } catch (err) {
    console.error("Error fetching gallery settings:", err);
    return null;
  }
};

export const getVideoSettings = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/videos/settings`, config);
    return res.data && res.data.status === true ? res.data.response : null;
  } catch (err) {
    console.error("Error fetching video settings:", err);
    return null;
  }
};

export const getNewsSettings = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/news/settings`, config);
    return res.data && res.data.status === true ? res.data.response : null;
  } catch (err) {
    console.error("Error fetching news settings:", err);
    return null;
  }
};

export const getHowItWorksSettings = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/how-it-works/settings`, config);
    return res.data && res.data.status === true ? res.data.response : null;
  } catch (err) {
    console.error("Error fetching how it works settings:", err);
    return null;
  }
};

export const getGalleryImages = async ({ page = 1, limit = DEFAULT_PAGE_SIZE } = {}) => {
  try {
    const config = {
      headers: { "Content-Type": "application/json" },
      params: { page, limit },
    };
    const res = await api.get(`/api/common/gallery`, config);
    if (res.data && res.data.status === true) {
      return res.data.response;
    }
    return { data: [], metadata: { has_more: false, totalRecord: 0 } };
  } catch (err) {
    console.error("Error fetching gallery images:", err);
    return { data: [], metadata: { has_more: false, totalRecord: 0 } };
  }
};

export const getSliderBanners = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/slider-banners`, config);
    return res.data && res.data.status === true ? res.data.response : [];
  } catch (err) {
    console.error("Error fetching slider banners:", err);
    return [];
  }
};

export const getVideos = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/videos`, config);
    return res.data && res.data.status === true ? res.data.response : [];
  } catch (err) {
    console.error("Error fetching videos:", err);
    return [];
  }
};

export const getNews = async () => {
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(`/api/common/news`, config);
    return res.data && res.data.status === true ? res.data.response : [];
  } catch (err) {
    console.error("Error fetching news:", err);
    return [];
  }
};
