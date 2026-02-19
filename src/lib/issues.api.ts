// src/lib/issues.api.ts
import { apiGet, apiPost } from "@/src/lib/api";
import type { Warehouse, Part, PartItem, InventoryRequest } from "@/src/lib/inventory.api";

export type IssueStatus = "DRAFT" | "POSTED" | "CANCELLED";

export type InventoryIssueLine = {
  id: string;
  issue_id?: string;
  part_id: string;
  part_item_id: string;
  qty: 1;
  unit_cost?: any;
  total_cost?: any;
  notes?: string | null;

  parts?: Part;
  part_items?: PartItem;
};

export type InventoryIssue = {
  id: string;
  warehouse_id: string;
  work_order_id: string;
  request_id?: string | null;
  issued_by?: string | null;
  status: IssueStatus;
  notes?: string | null;
  created_at?: string;
  posted_at?: string | null;

  warehouses?: Warehouse;
  requests?: InventoryRequest;
  inventory_issue_lines?: InventoryIssueLine[];
};

export async function listIssues(params?: {
  status?: string;
  warehouse_id?: string;
  request_id?: string;
  work_order_id?: string;
}) {
  return apiGet<{ items: InventoryIssue[] }>("/inventory/issues", params);
}

export async function getIssue(id: string) {
  return apiGet<InventoryIssue>(`/inventory/issues/${id}`);
}

export async function createIssueDraft(body: {
  warehouse_id: string;
  work_order_id: string;
  request_id?: string | null;
  notes?: string | null;
  lines: Array<{
    part_id: string;
    part_item_id: string;
    qty?: 1;
    unit_cost?: any;
    notes?: string | null;
  }>;
}) {
  return apiPost<InventoryIssue>("/inventory/issues", body);
}

export async function postIssue(id: string) {
  return apiPost<{ message: string; issue: InventoryIssue }>(`/inventory/issues/${id}/post`, {});
}
