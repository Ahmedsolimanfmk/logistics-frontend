export type InventoryRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | string;

export interface InventoryRequestWarehouse {
  id: string;
  name?: string | null;
  location?: string | null;
}

export interface InventoryRequestPart {
  id: string;
  name?: string | null;
  part_number?: string | null;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
}

export interface InventoryRequestLine {
  id?: string;
  part_id: string;
  needed_qty: number;
  notes?: string | null;
  parts?: InventoryRequestPart | null;
}

export interface InventoryRequestReservationPartItem {
  id?: string;
  internal_serial?: string | null;
  manufacturer_serial?: string | null;
  part_id?: string | null;
  status?: string | null;
  parts?: InventoryRequestPart | null;
  warehouses?: InventoryRequestWarehouse | null;
}

export interface InventoryReservation {
  id?: string;
  request_id?: string;
  part_item_id?: string;
  part_items?: InventoryRequestReservationPartItem | null;
}

export interface InventoryRequest {
  id: string;
  warehouse_id: string;
  work_order_id?: string | null;
  requested_by?: string | null;
  notes?: string | null;
  status?: InventoryRequestStatus;
  created_at?: string | null;
  warehouses?: InventoryRequestWarehouse | null;
  lines?: InventoryRequestLine[];
  reservations?: InventoryReservation[];
}

export interface CreateInventoryRequestPayload {
  warehouse_id: string;
  work_order_id?: string | null;
  notes?: string | null;
  lines: {
    part_id: string;
    needed_qty: number;
    notes?: string | null;
  }[];
}

export interface InventoryRequestsFilters {
  status?: string;
  warehouse_id?: string;
  work_order_id?: string;
}