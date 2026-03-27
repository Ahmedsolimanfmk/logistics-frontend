import { api } from "@/src/lib/api";
import type {
  InventoryRequest,
  CreateInventoryRequestPayload,
  InventoryRequestsFilters,
} from "@/src/types/inventory-requests.types";

function asArray<T = unknown>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data?.items)) return body.data.items as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  return [];
}

function normalizeSingle<T>(body: any): T {
  return (body?.data ?? body?.request ?? body) as T;
}

export const inventoryRequestsService = {
  async list(filters: InventoryRequestsFilters = {}): Promise<InventoryRequest[]> {
    const res = await api.get("/inventory/requests", { params: filters });
    return asArray<InventoryRequest>(res.data ?? res);
  },

  async getById(id: string): Promise<InventoryRequest> {
    const res = await api.get(`/inventory/requests/${id}`);
    return normalizeSingle<InventoryRequest>(res.data ?? res);
  },

  async create(payload: CreateInventoryRequestPayload): Promise<InventoryRequest> {
    const res = await api.post("/inventory/requests", payload);
    return normalizeSingle<InventoryRequest>(res.data ?? res);
  },

  async approve(id: string, notes?: string) {
    return api.post(`/inventory/requests/${id}/approve`, { notes });
  },

  async reject(id: string, reason: string) {
    return api.post(`/inventory/requests/${id}/reject`, { reason });
  },

  async unreserve(id: string, notes?: string) {
    return api.post(`/inventory/requests/${id}/unreserve`, { notes });
  },

  async createIssue(id: string, notes?: string) {
    return api.post(`/inventory/issues`, { request_id: id, notes });
  },
};

export default inventoryRequestsService;