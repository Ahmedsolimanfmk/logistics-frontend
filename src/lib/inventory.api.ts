// src/lib/inventory.api.ts
import { apiGet, apiPost } from "@/src/lib/api";

export type InventoryRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "ISSUED";

export type Warehouse = {
  id: string;
  name?: string | null;
  code?: string | null;
};

export type Part = {
  id: string;
  name?: string | null;
  sku?: string | null;
  unit?: string | null;
  brand?: string | null;
};

export type InventoryRequestLine = {
  id: string;
  request_id?: string;
  part_id: string;
  needed_qty: number;
  notes?: string | null;
  parts?: Part;
};

export type PartItem = {
  id: string;
  internal_serial?: string | null;
  manufacturer_serial?: string | null;
  status: string;
  part_id: string;
  warehouse_id: string;
  parts?: Part;
  warehouses?: Warehouse;
};

export type InventoryReservation = {
  id: string;
  request_id: string;
  part_item_id: string;
  part_items?: PartItem;
};

export type InventoryRequest = {
  id: string;
  warehouse_id: string;
  work_order_id?: string | null;
  requested_by?: string | null;
  status: InventoryRequestStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;

  warehouses?: Warehouse;
  lines?: InventoryRequestLine[];
  reservations?: InventoryReservation[];
  issues?: any[];
};

export async function listInventoryRequests(params?: {
  status?: string;
  warehouse_id?: string;
  work_order_id?: string;
}) {
  return apiGet<{ items: InventoryRequest[] }>("/inventory/requests", params);
}

export async function getInventoryRequest(id: string) {
  // NOTE: backend returns row directly (not wrapped)
  return apiGet<InventoryRequest>(`/inventory/requests/${id}`);
}

export async function approveInventoryRequest(id: string) {
  return apiPost<{
    message: string;
    request: InventoryRequest;
    reserved: Array<{
      request_line_id: string;
      part_id: string;
      reserved_qty: number;
      reserved_items: Array<{
        id: string;
        internal_serial?: string | null;
        manufacturer_serial?: string | null;
        status: string;
        part_id: string;
        warehouse_id: string;
      }>;
    }>;
  }>(`/inventory/requests/${id}/approve`, {});
}

export async function unreserveInventoryRequest(id: string) {
  return apiPost<{
    message: string;
    request: InventoryRequest;
    unreserved_count: number;
  }>(`/inventory/requests/${id}/unreserve`, {});
}

export async function rejectInventoryRequest(id: string, reason?: string) {
  // NOTE: backend returns updated row directly
  return apiPost<InventoryRequest>(`/inventory/requests/${id}/reject`, reason ? { reason } : {});
}
