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

function unwrap<T = any>(raw: any): T {
  const body = raw?.data ?? raw;
  return (body?.data ?? body) as T;
}

function normalizeSite(raw: any): Site {
  const site = raw || {};

  return {
    id: String(site.id || ""),
    client_id: String(site.client_id || ""),
    company_id: site.company_id ?? undefined,

    code: site.code ?? null,
    name: String(site.name || ""),
    address: site.address ?? null,

    is_active: typeof site.is_active === "boolean" ? site.is_active : true,
    created_at: site.created_at ?? null,
    updated_at: site.updated_at ?? null,

    client: site.client
      ? {
          id: String(site.client.id || ""),
          name: site.client.name ?? null,
          code: site.client.code ?? null,
          is_active: site.client.is_active ?? null,
        }
      : null,
  };
}

function normalizeSitesList(body: any): SitesListResponse {
  const items = asArray(body).map(normalizeSite);

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
    if (filters.code) params.code = filters.code;
    if (typeof filters.is_active === "boolean") params.is_active = filters.is_active;

    const res = await api.get("/sites", { params });
    const body = res.data ?? res;

    return normalizeSitesList(body);
  },

  async getById(id: string): Promise<Site> {
    const res = await api.get(`/sites/${id}`);
    return normalizeSite(unwrap(res));
  },

  async create(payload: SitePayload): Promise<Site> {
    const res = await api.post("/sites", payload);
    return normalizeSite(unwrap(res));
  },

  async update(id: string, payload: SitePayload): Promise<Site> {
    const res = await api.put(`/sites/${id}`, payload);
    return normalizeSite(unwrap(res));
  },

  async toggle(id: string): Promise<Site> {
    const res = await api.patch(`/sites/${id}/toggle`);
    return normalizeSite(unwrap(res));
  },

  async listClientsOptions(): Promise<SiteClientOption[]> {
    const res = await api.get("/clients", {
      params: { page: 1, limit: 200 },
    });
    const body = res.data ?? res;
    return normalizeClientsOptions(body);
  },
};

export default sitesService;