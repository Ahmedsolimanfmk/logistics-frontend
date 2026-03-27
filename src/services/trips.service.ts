import { api } from "@/src/lib/api";
import type { ApiListResponse } from "@/src/types/api.types";
import type {
  Trip,
  TripListFilters,
  TripCreatePayload,
  TripAssignPayload,
  TripOptionClient,
  TripOptionSite,
  TripOptionVehicle,
  TripOptionDriver,
  TripOptionSupervisor,
} from "@/src/types/trips.types";

export interface TripOptionContract {
  id: string;
  contract_no?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  currency?: string | null;
  client_id?: string | null;
}

type ListLikeResponse<T> = ApiListResponse<T>;

function asArray<T = unknown>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data?.items)) return body.data.items as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  return [];
}

function toNumberOr(value: any, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePagination(body: any, itemsLength: number) {
  const total = toNumberOr(
    body?.total ?? body?.meta?.total ?? body?.count ?? body?.data?.total ?? itemsLength,
    itemsLength
  );

  const page = toNumberOr(body?.page ?? body?.meta?.page ?? 1, 1);

  const pageSize = toNumberOr(
    body?.pageSize ?? body?.meta?.pageSize ?? body?.meta?.limit ?? 25,
    25
  );

  const pages = toNumberOr(
    body?.pages ??
      body?.meta?.pages ??
      Math.max(Math.ceil(total / Math.max(pageSize, 1)), 1),
    1
  );

  return { total, page, pageSize, pages };
}

function normalizeTripsList(body: any): ListLikeResponse<Trip> {
  const items = asArray<Trip>(body);
  const { total, page, pageSize, pages } = normalizePagination(body, items.length);

  return {
    items,
    total,
    page,
    pageSize,
    pages,
  };
}

function normalizeContractsList(body: any): TripOptionContract[] {
  return asArray<any>(body).map((row) => ({
    id: String(row?.id || ""),
    contract_no: row?.contract_no ?? null,
    status: row?.status ?? null,
    start_date: row?.start_date ?? null,
    end_date: row?.end_date ?? null,
    currency: row?.currency ?? null,
    client_id: row?.client_id ?? row?.clients?.id ?? null,
  }));
}

function normalizeSingle<T>(body: any): T {
  return (body?.data ?? body?.trip ?? body) as T;
}

export const tripsService = {
  async list(filters: TripListFilters = {}): Promise<ApiListResponse<Trip>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
    };

    if (filters.status) params.status = filters.status;
    if (filters.client_id) params.client_id = filters.client_id;
    if (filters.route_id) params.route_id = filters.route_id;

    const res = await api.get("/trips", { params });
    return normalizeTripsList(res.data ?? res);
  },

  async getById(id: string): Promise<Trip> {
    const res = await api.get(`/trips/${id}`);
    return normalizeSingle<Trip>(res.data ?? res);
  },

  async create(payload: TripCreatePayload & { contract_id?: string | null }): Promise<Trip> {
    const cleanPayload = {
      ...payload,
      contract_id: payload.contract_id || null,
    };

    const res = await api.post("/trips", cleanPayload);
    return normalizeSingle<Trip>(res.data ?? res);
  },

  async assign(id: string, payload: TripAssignPayload): Promise<any> {
    const res = await api.post(`/trips/${id}/assign`, payload);
    return res.data ?? res;
  },

  async start(id: string): Promise<any> {
    const res = await api.post(`/trips/${id}/start`);
    return res.data ?? res;
  },

  async finish(id: string): Promise<any> {
    const res = await api.post(`/trips/${id}/finish`);
    return res.data ?? res;
  },

  async listClientsOptions(): Promise<TripOptionClient[]> {
    const res = await api.get("/clients");
    return asArray<TripOptionClient>(res.data ?? res);
  },

  async listSitesOptions(clientId?: string): Promise<TripOptionSite[]> {
    const res = await api.get("/sites", {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return asArray<TripOptionSite>(res.data ?? res);
  },

  async listContractsOptions(clientId?: string): Promise<TripOptionContract[]> {
    const res = await api.get("/contracts", {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return normalizeContractsList(res.data ?? res);
  },

  async listVehiclesOptions(): Promise<TripOptionVehicle[]> {
    const res = await api.get("/vehicles");
    return asArray<TripOptionVehicle>(res.data ?? res);
  },

  async listDriversOptions(): Promise<TripOptionDriver[]> {
    const res = await api.get("/drivers/active");
    return asArray<TripOptionDriver>(res.data ?? res);
  },

  async listSupervisorsOptions(): Promise<TripOptionSupervisor[]> {
    const res = await api.get("/users");
    const items = asArray<TripOptionSupervisor & { role?: string | null }>(res.data ?? res);

    return items.filter(
      (x) => String(x.role || "").toUpperCase() === "FIELD_SUPERVISOR"
    );
  },
};

export default tripsService;