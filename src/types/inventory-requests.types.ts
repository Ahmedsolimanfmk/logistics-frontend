export type InventoryRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | string;

export interface InventoryRequestWarehouse {
  id: string;
  name?: string | null;
}

export interface InventoryRequestPart {
  id: string;
  name?: string | null;
}

export interface InventoryRequestLine {
  part_id: string;
  needed_qty: number;
  notes?: string | null;

  parts?: InventoryRequestPart | null;
}

export interface InventoryReservation {
  part_item_id: string;

  part_items?: {
    internal_serial?: string | null;
    manufacturer_serial?: string | null;
    part_id?: string;
    status?: string;
    parts?: InventoryRequestPart;
  };
}

export interface InventoryRequest {
  id: string;

  warehouse_id: string;
  work_order_id?: string | null;

  status?: InventoryRequestStatus;

  created_at?: string;

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