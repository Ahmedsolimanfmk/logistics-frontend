// src/lib/receipts.api.ts
import { apiGet, apiPost } from "@/src/lib/api";
import type { Warehouse, Part } from "@/src/lib/inventory.api";

export type ReceiptStatus = "DRAFT" | "POSTED" | "CANCELLED";

export type ReceiptItem = {
  id: string;
  receipt_id?: string;
  part_id: string;
  internal_serial: string;
  manufacturer_serial: string;
  unit_cost?: number | null;
  notes?: string | null;

  parts?: Part;
};

export type CashExpense = {
  id: string;
  payment_source: string;
  expense_type: string;
  amount: number;
  vendor_name?: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  invoice_total?: number | null;
  approval_status?: string | null;
  created_at?: string;
};

export type InventoryReceipt = {
  id: string;
  warehouse_id: string;
  supplier_name: string;
  invoice_no?: string | null;
  invoice_date?: string | null;
  status: ReceiptStatus;
  created_by?: string | null;
  posted_at?: string | null;
  total_amount?: number | null;
  created_at?: string;

  warehouses?: Warehouse;
  items?: ReceiptItem[];
  cash_expenses?: CashExpense | CashExpense[] | null;
};

export async function listReceipts(params?: { status?: string; warehouse_id?: string }) {
  return apiGet<{ items: InventoryReceipt[] }>("/inventory/receipts", params);
}

export async function getReceipt(id: string) {
  return apiGet<InventoryReceipt>(`/inventory/receipts/${id}`);
}

export async function createReceipt(body: {
  warehouse_id: string;
  supplier_name: string;
  invoice_no?: string | null;
  invoice_date?: string | null; // "YYYY-MM-DD" or ISO
  items: Array<{
    part_id: string;
    internal_serial: string;
    manufacturer_serial: string;
    unit_cost?: number | string | null;
    notes?: string | null;
  }>;
}) {
  return apiPost<InventoryReceipt>("/inventory/receipts", body);
}

export async function postReceipt(id: string) {
  return apiPost<{ message: string; receipt: InventoryReceipt; cash_expense: CashExpense }>(
    `/inventory/receipts/${id}/post`,
    {}
  );
}
