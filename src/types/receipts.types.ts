export type ReceiptStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "POSTED"
  | "CANCELLED"
  | string;

export interface ReceiptWarehouse {
  id: string;
  name?: string | null;
}

export interface ReceiptVendor {
  id: string;
  name?: string | null;
}

export interface ReceiptPart {
  id: string;
  name?: string | null;
  part_number?: string | null;
  brand?: string | null;
}

export interface ReceiptItem {
  id?: string;
  part_id: string;
  internal_serial?: string | null;
  manufacturer_serial?: string | null;
  unit_cost?: number | string | null;
  notes?: string | null;
  part?: ReceiptPart | null;
}

export interface InventoryReceipt {
  id: string;
  warehouse_id?: string | null;
  vendor_id?: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  status?: ReceiptStatus;
  total_amount?: number | null;
  notes?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
  posted_at?: string | null;
  warehouse?: ReceiptWarehouse | null;
  vendor?: ReceiptVendor | null;
  items?: ReceiptItem[] | null;
}

export interface CreateReceiptPayload {
  warehouse_id: string;
  vendor_id: string;
  invoice_no?: string | null;
  invoice_date?: string | null;
  notes?: string | null;
  items: {
    part_id: string;
    internal_serial: string;
    manufacturer_serial?: string | null;
    unit_cost?: string | number | null;
    notes?: string | null;
  }[];
}

export interface ReceiptsFilters {
  status?: string;
  warehouse_id?: string;
}

export interface ReceiptsListResult {
  items: InventoryReceipt[];
}