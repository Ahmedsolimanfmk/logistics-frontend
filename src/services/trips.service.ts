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

function asArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function normalizeTripsList(body: any): ApiListResponse<Trip> {
  const items = asArray(body);
  const totalRaw =
    body?.total ??
    body?.meta?.total ??
    body?.count ??
    body?.data?.total ??
    items.length;

  return {
    items,
    total: Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : items.length,
    page: Number(body?.page || body?.meta?.page || 1),
    pages: Number(
      body?.pages ||
        body?.meta?.pages ||
        Math.max(Math.ceil((Number(totalRaw) || items.length) / Number(body?.pageSize || 25)), 1)
    ),
  };
}

function normalizeContractsList(body: any): TripOptionContract[] {
  return asArray(body).map((row: any) => ({
    id: String(row?.id || ""),
    contract_no: row?.contract_no ?? null,
    status: row?.status ?? null,
    start_date: row?.start_date ?? null,
    end_date: row?.end_date ?? null,
    currency: row?.currency ?? null,
    client_id: row?.client_id ?? row?.clients?.id ?? null,
  }));
}

export const tripsService = {
  async list(filters: TripListFilters = {}): Promise<ApiListResponse<Trip>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
    };

    if (filters.status) params.status = filters.status;
    if ((filters as any).client_id) params.client_id = (filters as any).client_id;
    if ((filters as any).route_id) params.route_id = (filters as any).route_id;

    const res = await api.get("/trips", { params });
    const body = res.data ?? res;
    return normalizeTripsList(body);
  },

  async getById(id: string): Promise<Trip> {
    const res = await api.get(`/trips/${id}`);
    const body = res.data ?? res;
    return (body?.trip || body) as Trip;
  },

  async create(payload: TripCreatePayload & { contract_id?: string | null }) {
    const cleanPayload = {
      ...payload,
      contract_id: payload.contract_id || null,
    };

    const res = await api.post("/trips", cleanPayload);
    return res.data ?? res;
  },

  async assign(id: string, payload: TripAssignPayload) {
    const res = await api.post(`/trips/${id}/assign`, payload);
    return res.data ?? res;
  },

  async start(id: string) {
    const res = await api.post(`/trips/${id}/start`);
    return res.data ?? res;
  },

  async finish(id: string) {
    const res = await api.post(`/trips/${id}/finish`);
    return res.data ?? res;
  },

  async listClientsOptions(): Promise<TripOptionClient[]> {
    const res = await api.get("/clients");
    return asArray(res.data ?? res);
  },

  async listSitesOptions(clientId?: string): Promise<TripOptionSite[]> {
    const res = await api.get("/sites", {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return asArray(res.data ?? res);
  },

  async listContractsOptions(clientId?: string): Promise<TripOptionContract[]> {
    const res = await api.get("/contracts", {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return normalizeContractsList(res.data ?? res);
  },

  async listVehiclesOptions(): Promise<TripOptionVehicle[]> {
    const res = await api.get("/vehicles");
    return asArray(res.data ?? res);
  },

  async listDriversOptions(): Promise<TripOptionDriver[]> {
    const res = await api.get("/drivers/active");
    return asArray(res.data ?? res);
  },

  async listSupervisorsOptions(): Promise<TripOptionSupervisor[]> {
    const res = await api.get("/users");
    const items = asArray(res.data ?? res);
    return items.filter(
      (x: any) => String(x.role || "").toUpperCase() === "FIELD_SUPERVISOR"
    );
  },
};