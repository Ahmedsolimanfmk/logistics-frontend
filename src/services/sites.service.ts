import { api } from "@/src/lib/api";
import type {
  Site,
  SiteClientOption,
  SitePayload,
  SitesListFilters,
  SitesListResponse,
} from "@/src/types/sites.types";

function asArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function toNumberOr(value: any, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSitesList(body: any): SitesListResponse {
  const items = asArray(body) as Site[];
  const total = toNumberOr(
    body?.total ?? body?.meta?.total ?? body?.count ?? items.length,
    items.length
  );

  const page = toNumberOr(body?.meta?.page ?? body?.page ?? 1, 1);
  const limit = toNumberOr(
    body?.meta?.limit ?? body?.limit ?? body?.pageSize ?? 50,
    50
  );
  const pages = toNumberOr(
    body?.meta?.pages ?? Math.max(Math.ceil(total / Math.max(limit, 1)), 1),
    1
  );

  return {
    items,
    total,
    meta: {
      page,
      limit,
      pages,
    },
  };
}

function normalizeClientsOptions(body: any): SiteClientOption[] {
  const items = asArray(body);

  return items.map((item: any) => ({
    id: String(item?.id ?? ""),
    name: item?.name ?? null,
  }));
}

export const sitesService = {
  async list(filters: SitesListFilters = {}): Promise<SitesListResponse> {
    const params: Record<string, any> = {};

    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.search) params.search = filters.search;
    if (filters.client_id) params.client_id = filters.client_id;

    const res = await api.get("/sites", { params });
    const body = res.data ?? res;

    return normalizeSitesList(body);
  },

  async getById(id: string): Promise<Site> {
    const res = await api.get(`/sites/${id}`);
    const body = res.data ?? res;
    return (body?.data ?? body) as Site;
  },

  async create(payload: SitePayload): Promise<Site> {
    const res = await api.post("/sites", payload);
    const body = res.data ?? res;
    return (body?.data ?? body) as Site;
  },

  async update(id: string, payload: SitePayload): Promise<Site> {
    const res = await api.put(`/sites/${id}`, payload);
    const body = res.data ?? res;
    return (body?.data ?? body) as Site;
  },

  async toggle(id: string): Promise<Site> {
    const res = await api.patch(`/sites/${id}/toggle`);
    const body = res.data ?? res;
    return (body?.data ?? body) as Site;
  },

  async listClientsOptions(): Promise<SiteClientOption[]> {
    const res = await api.get("/clients");
    const body = res.data ?? res;
    return normalizeClientsOptions(body);
  },
};

export default sitesService;