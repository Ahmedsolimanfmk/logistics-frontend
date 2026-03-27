import { api } from "@/src/lib/api";
import type {
  CreateIssueDraftPayload,
  InventoryIssue,
  InventoryRequest,
  IssueFilters,
  PartItem,
  PartItemsFilters,
} from "@/src/types/inventory-issues.types";

function asArray<T = unknown>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data?.items)) return body.data.items as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  return [];
}

function normalizeSingle<T>(body: any): T {
  return (body?.data ?? body?.issue ?? body?.request ?? body) as T;
}

export const inventoryIssuesService = {
  async getInventoryRequest(id: string): Promise<InventoryRequest> {
    const res = await api.get(`/inventory/requests/${id}`);
    return normalizeSingle<InventoryRequest>(res.data ?? res);
  },

  async createIssueDraft(payload: CreateIssueDraftPayload): Promise<InventoryIssue> {
    const res = await api.post("/inventory/issues", payload);
    return normalizeSingle<InventoryIssue>(res.data ?? res);
  },

  async listIssues(filters: IssueFilters = {}): Promise<InventoryIssue[]> {
    const res = await api.get("/inventory/issues", { params: filters });
    return asArray<InventoryIssue>(res.data ?? res);
  },

  async getIssue(id: string): Promise<InventoryIssue> {
    const res = await api.get(`/inventory/issues/${id}`);
    return normalizeSingle<InventoryIssue>(res.data ?? res);
  },

  async postIssue(id: string): Promise<InventoryIssue> {
    const res = await api.post(`/inventory/issues/${id}/post`);
    return normalizeSingle<InventoryIssue>(res.data ?? res);
  },

  async listPartItems(filters: PartItemsFilters = {}): Promise<PartItem[]> {
    const res = await api.get("/inventory/part-items", { params: filters });
    return asArray<PartItem>(res.data ?? res);
  },
};

export default inventoryIssuesService;