export type ReceiptStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "POSTED"
  | "CANCELLED"
  | "ALL"
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

export interface ReceiptBulkLine {
  id?: string;
  part_id: string;
  qty: number;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  notes?: string | null;
  part?: ReceiptPart | null;
}

export interface ReceiptLinkedCashExpense {
  id: string;
  approval_status?: string | null;
  amount?: number | null;
  type?: string | null;
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
  bulk_lines?: ReceiptBulkLine[] | null;

  cash_expense?: ReceiptLinkedCashExpense | null;
  cash_expenses?: ReceiptLinkedCashExpense[] | null;
}

export interface CreateReceiptPayload {
  warehouse_id: string;
  vendor_id: string;

  invoice_no?: string | null;
  invoice_date?: string | null;
  notes?: string | null;

  items?: {
    part_id: string;
    internal_serial: string;
    manufacturer_serial?: string | null;
    unit_cost?: string | number | null;
    notes?: string | null;
  }[];

  bulk_lines?: {
    part_id: string;
    qty: number;
    unit_cost?: string | number | null;
    notes?: string | null;
  }[];
}

export interface ReceiptsFilters {
  status?: string;
  warehouse_id?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface ReceiptsListResult {
  items: InventoryReceipt[];
  total: number;
  page: number;
  page_size: number;
}

export interface ReceiptsKpi {
  postedSum: number;
  postedCount: number;
  submittedSum: number;
  submittedCount: number;
}