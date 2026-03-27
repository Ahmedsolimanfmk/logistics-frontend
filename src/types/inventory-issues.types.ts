export type IssueStatus = "DRAFT" | "POSTED" | "CANCELLED" | string;
export type ItemStatus = "IN_STOCK" | "RESERVED" | "ISSUED" | string;
export type ToastType = "success" | "error";

export interface InventoryWarehouseRef {
  id: string;
  name?: string | null;
  location?: string | null;
}

export interface InventoryPartRef {
  id: string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
  part_number?: string | null;
}

export interface PartItem {
  id: string;
  part_id: string;
  warehouse_id: string;
  status?: ItemStatus | null;
  internal_serial?: string | null;
  manufacturer_serial?: string | null;
  received_at?: string | null;
  last_moved_at?: string | null;

  parts?: InventoryPartRef | null;
  warehouses?: InventoryWarehouseRef | null;
}

export interface InventoryIssueLine {
  id?: string;
  part_id: string;
  part_item_id?: string | null;
  qty: number;
  unit_cost?: number | null;
  total_cost?: number | null;

  parts?: InventoryPartRef | null;
  part_items?: PartItem | null;
}

export interface InventoryIssue {
  id: string;
  status?: IssueStatus | null;

  warehouse_id?: string | null;
  request_id?: string | null;
  work_order_id?: string | null;

  notes?: string | null;
  created_at?: string | null;
  posted_at?: string | null;

  warehouses?: InventoryWarehouseRef | null;
  inventory_issue_lines?: InventoryIssueLine[];
}

export interface InventoryRequestReservation {
  id?: string;
  part_items?: PartItem | null;
}

export interface InventoryRequest {
  id: string;
  warehouse_id?: string | null;
  work_order_id?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;

  reservations?: InventoryRequestReservation[];
}

export interface CreateIssueDraftLinePayload {
  part_id: string;
  part_item_id: string;
  qty: number;
}

export interface CreateIssueDraftPayload {
  warehouse_id: string;
  work_order_id: string;
  request_id: string | null;
  notes?: string | null;
  lines: CreateIssueDraftLinePayload[];
}

export interface IssueFilters {
  status?: string;
  warehouse_id?: string;
  request_id?: string;
  work_order_id?: string;
}

export interface PartItemsFilters {
  warehouse_id?: string;
  status?: string;
  q?: string;
}