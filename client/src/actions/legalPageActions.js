import api from "@src/utils/axiosSetup";

/** Single legal/policy page by slug (public, unauthenticated). */
export const getLegalPageBySlug = (slug) => async () => {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) {
    return { status: false, data: null };
  }
  try {
    const config = { headers: { "Content-Type": "application/json" } };
    const res = await api.get(
      `/api/common/legal-pages/${encodeURIComponent(normalizedSlug)}`,
      config,
    );
    if (res.data?.status === true) {
      const data = res.data.response;
      return {
        status: true,
        data: {
          title: data?.title || "",
          sections: Array.isArray(data?.sections) ? data.sections : [],
        },
      };
    }
    return { status: false, data: null };
  } catch (err) {
    return { status: false, data: null, error: err };
  }
};
