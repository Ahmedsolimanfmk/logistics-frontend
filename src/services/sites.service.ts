import { api } from "@/src/lib/api";
import type { ApiListResponse } from "@/src/types/api.types";
import type { Site, SiteClientOption, SiteListFilters, SitePayload } from "@/src/types/sites.types";

function normalizeSitesList(body: any): ApiListResponse<Site> {
  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body)
    ? body
    : Array.isArray(body?.data?.items)
    ? body.data.items
    : [];

  const totalRaw =
    body?.meta?.total ??
    body?.total ??
    body?.count ??
    items.length;

  return {
    items,
    total: Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : items.length,
  };
}

export const sitesService = {
  async list(filters: SiteListFilters = {}): Promise<ApiListResponse<Site>> {
    const params: Record<string, any> = {};

    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.client_id) params.client_id = filters.client_id;

    const res = await api.get("/sites", { params });
    const body = res.data ?? res;
    return normalizeSitesList(body);
  },

  async listClientsOptions(): Promise<SiteClientOption[]> {
    const res = await api.get("/clients");
    const body = res.data ?? res;

    const items = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body)
      ? body
      : Array.isArray(body?.data?.items)
      ? body.data.items
      : [];

    return items;
  },

  async create(payload: SitePayload) {
    const res = await api.post("/sites", payload);
    return res.data ?? res;
  },

  async update(id: string, payload: SitePayload) {
    const res = await api.put(`/sites/${id}`, payload);
    return res.data ?? res;
  },

  async toggle(id: string) {
    const res = await api.patch(`/sites/${id}/toggle`);
    return res.data ?? res;
  },
};