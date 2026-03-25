import { api } from "@/src/lib/api";
import type {
  Client,
  ClientDashboardResponse,
  ClientDetailsResponse,
  ClientPayload,
  ClientProfilePayload,
  ClientsListFilters,
  ClientsListResponse,
} from "@/src/types/clients.types";

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

function normalizeClientsList(body: any): ClientsListResponse {
  const items = asArray(body) as Client[];

  const total = toNumberOr(
    body?.total ?? body?.meta?.total ?? body?.count ?? items.length,
    items.length
  );

  const page = toNumberOr(body?.meta?.page ?? body?.page ?? 1, 1);
  const limit = toNumberOr(body?.meta?.limit ?? body?.limit ?? 50, 50);
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

export const clientsService = {
  async list(filters: ClientsListFilters = {}): Promise<ClientsListResponse> {
    const params: Record<string, any> = {};

    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const res = await api.get("/clients", { params });
    const body = res.data ?? res;

    return normalizeClientsList(body);
  },

  async getByIdFromDetails(id: string, month: string): Promise<ClientDetailsResponse> {
    const res = await api.get(`/clients/${id}/details`, {
      params: { month },
    });
    return (res.data ?? res) as ClientDetailsResponse;
  },

  async getDashboard(id: string, month: string): Promise<ClientDashboardResponse> {
    const res = await api.get(`/clients/${id}/dashboard`, {
      params: { month },
    });
    return (res.data ?? res) as ClientDashboardResponse;
  },

  async create(payload: ClientPayload): Promise<Client> {
    const res = await api.post("/clients", payload);
    const body = res.data ?? res;
    return (body?.data ?? body) as Client;
  },

  async update(id: string, payload: ClientPayload): Promise<Client> {
    const res = await api.put(`/clients/${id}`, payload);
    const body = res.data ?? res;
    return (body?.data ?? body) as Client;
  },

  async updateProfile(id: string, payload: ClientProfilePayload): Promise<Client> {
    const res = await api.put(`/clients/${id}/profile`, payload);
    const body = res.data ?? res;
    return (body?.data ?? body) as Client;
  },

  async toggle(id: string): Promise<Client> {
    const res = await api.patch(`/clients/${id}/toggle`);
    const body = res.data ?? res;
    return (body?.data ?? body) as Client;
  },
};

export default clientsService;