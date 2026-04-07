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

function compact(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== "")
  );
}

export const inventoryRequestsService = {
  async list(filters: InventoryRequestsFilters = {}): Promise<InventoryRequest[]> {
    const res = await api.get("/inventory/requests", {
      params: compact({
        status: filters.status,
        warehouse_id: filters.warehouse_id,
        work_order_id: filters.work_order_id,
      }),
    });

    return asArray<InventoryRequest>(res?.data ?? res);
  },

  async getById(id: string): Promise<InventoryRequest> {
    const res = await api.get(`/inventory/requests/${id}`);
    return normalizeSingle<InventoryRequest>(res?.data ?? res);
  },

  async create(payload: CreateInventoryRequestPayload): Promise<InventoryRequest> {
    const res = await api.post("/inventory/requests", payload);
    return normalizeSingle<InventoryRequest>(res?.data ?? res);
  },

  async approve(id: string): Promise<InventoryRequest> {
    const res = await api.post(`/inventory/requests/${id}/approve`, {});
    return normalizeSingle<InventoryRequest>(res?.data ?? res);
  },

  async reject(id: string, reason: string): Promise<InventoryRequest> {
    const res = await api.post(`/inventory/requests/${id}/reject`, { reason });
    return normalizeSingle<InventoryRequest>(res?.data ?? res);
  },

  async unreserve(id: string): Promise<InventoryRequest> {
    const res = await api.post(`/inventory/requests/${id}/unreserve`, {});
    return normalizeSingle<InventoryRequest>(res?.data ?? res);
  },
};

export default inventoryRequestsService;