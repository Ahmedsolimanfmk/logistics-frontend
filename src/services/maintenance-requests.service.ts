import { api } from "@/src/lib/api";
import type { ApiListResponse } from "@/src/types/api.types";
import type {
  MaintenanceRequest,
  MaintenanceRequestsListFilters,
  VehicleOption,
  CreateMaintenanceRequestPayload,
  ApproveMaintenanceRequestPayload,
  RejectMaintenanceRequestPayload,
  ApproveMaintenanceRequestResponse,
} from "@/src/types/maintenance-requests.types";

function normalizeMaintenanceRequestsList(body: any): ApiListResponse<MaintenanceRequest> {
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
    body?.data?.total ??
    body?.data?.count ??
    items.length;

  return {
    items,
    total: Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : items.length,
    page: Number(body?.meta?.page || body?.data?.meta?.page || 1),
    pages: Number(body?.meta?.pages || body?.data?.meta?.pages || 1),
  };
}

function normalizeVehicleOptions(body: any): VehicleOption[] {
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  return [];
}

export const maintenanceRequestsService = {
  async list(filters: MaintenanceRequestsListFilters = {}): Promise<ApiListResponse<MaintenanceRequest>> {
    const params: Record<string, any> = {};

    if (filters.status) params.status = filters.status;
    if (filters.vehicle_id) params.vehicle_id = filters.vehicle_id;
    if (filters.q?.trim()) params.q = filters.q.trim();
    if (typeof filters.page === "number") params.page = filters.page;
    if (typeof filters.limit === "number") params.limit = filters.limit;

    const res = await api.get("/maintenance/requests", { params });
    const body = res.data ?? res;
    return normalizeMaintenanceRequestsList(body);
  },

  async listVehicleOptions(): Promise<VehicleOption[]> {
    const res = await api.get("/maintenance/vehicles/options");
    const body = res.data ?? res;
    return normalizeVehicleOptions(body);
  },

  async create(payload: CreateMaintenanceRequestPayload) {
    const res = await api.post("/maintenance/requests", payload);
    return res.data ?? res;
  },

  async approve(
    id: string,
    payload: ApproveMaintenanceRequestPayload
  ): Promise<ApproveMaintenanceRequestResponse> {
    const res = await api.post(`/maintenance/requests/${id}/approve`, payload);
    return (res.data ?? res) as ApproveMaintenanceRequestResponse;
  },

  async reject(id: string, payload: RejectMaintenanceRequestPayload) {
    const res = await api.post(`/maintenance/requests/${id}/reject`, payload);
    return res.data ?? res;
  },
};