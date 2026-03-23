import { api } from "@/src/lib/api";
import type { ApiListResponse } from "@/src/types/api.types";
import type {
  Vehicle,
  VehicleListFilters,
  VehiclePayload,
  VehicleSummaryResponse,
} from "@/src/types/vehicles.types";

function normalizeVehicleList(body: any, fallbackPage = 1): ApiListResponse<Vehicle> {
  return {
    items: Array.isArray(body?.items) ? body.items : [],
    total: Number(body?.meta?.total || body?.total || 0),
    page: Number(body?.meta?.page || fallbackPage || 1),
    pages: Number(body?.meta?.pages || 1),
  };
}

export const vehiclesService = {
  async list(filters: VehicleListFilters): Promise<ApiListResponse<Vehicle>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
      limit: filters.pageSize || 25,
    };

    if (filters.q) params.q = filters.q;
    if (filters.status) params.status = filters.status;

    if (filters.active === "1") params.is_active = true;
    else if (filters.active === "0") params.is_active = false;

    const res = await api.get("/vehicles", { params });
    const body = res.data ?? res;
    return normalizeVehicleList(body, filters.page || 1);
  },

  async getSummary(id: string): Promise<VehicleSummaryResponse> {
    const res = await api.get(`/vehicles/${id}/summary`);
    return (res.data ?? res) as VehicleSummaryResponse;
  },

  async create(payload: VehiclePayload) {
    const res = await api.post("/vehicles", payload);
    return res.data ?? res;
  },

  async update(id: string, payload: VehiclePayload) {
    const res = await api.patch(`/vehicles/${id}`, payload);
    return res.data ?? res;
  },

  async toggle(id: string) {
    const res = await api.patch(`/vehicles/${id}/toggle`, {});
    return res.data ?? res;
  },
};