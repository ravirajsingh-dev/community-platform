import api from "@src/utils/axiosSetup";

const ACTIVE_LIST_QUERY = "limit=1000&page=1&activeOnly=true";

function parseAdminListResponse(res) {
  if (
    res.data?.status === true &&
    res.data.response &&
    res.data.response[0]
  ) {
    return res.data.response[0].data || [];
  }
  return [];
}

export async function fetchActiveCommunities() {
  const res = await api.get(`/api/admin/communities?${ACTIVE_LIST_QUERY}`);
  return parseAdminListResponse(res);
}

export async function fetchActiveVanshes(communityId) {
  if (!communityId) return [];
  const res = await api.get(
    `/api/admin/vansh?${ACTIVE_LIST_QUERY}&communityId=${communityId}`,
  );
  return parseAdminListResponse(res);
}

export async function fetchActiveKuls(vanshId) {
  if (!vanshId) return [];
  const res = await api.get(
    `/api/admin/kul?${ACTIVE_LIST_QUERY}&vanshId=${vanshId}`,
  );
  return parseAdminListResponse(res);
}

export async function fetchActiveKhamps(kulId) {
  if (!kulId) return [];
  const res = await api.get(
    `/api/admin/khamp?${ACTIVE_LIST_QUERY}&kulId=${kulId}`,
  );
  return parseAdminListResponse(res);
}

export async function fetchActiveSubKhamps(khampId) {
  if (!khampId) return [];
  const res = await api.get(
    `/api/admin/sub-khamp?${ACTIVE_LIST_QUERY}&khampId=${khampId}`,
  );
  return parseAdminListResponse(res);
}

export function toHierarchySelectOptions(items = []) {
  return items.map((item) => ({
    value: item._id,
    label: item.name,
  }));
}

export function getHierarchySelectOption(items, id) {
  if (!id) return null;
  const item = items.find((entry) => entry._id === id);
  if (item) {
    return { value: item._id, label: item.name };
  }
  return { value: id, label: String(id) };
}
