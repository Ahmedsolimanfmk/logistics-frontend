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

function toNumberOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function unwrapBody<T = any>(raw: any): T {
  const body = raw?.data ?? raw;

  if (body && typeof body === "object" && "data" in body && body.data !== undefined) {
    return body.data as T;
  }

  return body as T;
}

function normalizeClientsList(raw: any): ClientsListResponse {
  const body = raw?.data ?? raw;

  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body?.data?.items)
      ? body.data.items
      : [];

  const total = toNumberOr(body?.total, items.length);
  const page = toNumberOr(body?.meta?.page, 1);
  const limit = toNumberOr(body?.meta?.limit, 50);
  const pages = toNumberOr(
    body?.meta?.pages,
    Math.max(Math.ceil(total / Math.max(limit, 1)), 1)
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
    if (typeof filters.is_active === "boolean") params.is_active = filters.is_active;

    const res = await api.get("/clients", { params });
    return normalizeClientsList(res);
  },

  async getById(id: string): Promise<Client> {
    const res = await api.get(`/clients/${id}`);
    return unwrapBody<Client>(res);
  },

  async getDetails(id: string, month: string): Promise<ClientDetailsResponse> {
    const res = await api.get(`/clients/${id}/details`, {
      params: { month },
    });
    return unwrapBody<ClientDetailsResponse>(res);
  },

  async getDashboard(id: string, month: string): Promise<ClientDashboardResponse> {
    const res = await api.get(`/clients/${id}/dashboard`, {
      params: { month },
    });
    return unwrapBody<ClientDashboardResponse>(res);
  },

  async create(payload: ClientPayload): Promise<Client> {
    const res = await api.post("/clients", payload);
    return unwrapBody<Client>(res);
  },

  async update(id: string, payload: ClientPayload): Promise<Client> {
    const res = await api.put(`/clients/${id}`, payload);
    return unwrapBody<Client>(res);
  },

  async updateProfile(id: string, payload: ClientProfilePayload): Promise<Client> {
    const res = await api.put(`/clients/${id}/profile`, payload);
    return unwrapBody<Client>(res);
  },

  async toggle(id: string): Promise<Client> {
    const res = await api.patch(`/clients/${id}/toggle`);
    return unwrapBody<Client>(res);
  },
};

export default clientsService;