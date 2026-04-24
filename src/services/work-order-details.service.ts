import { api } from "@/src/lib/api";
import type {
  WorkOrderByIdResponse,
  ReportResponse,
  Warehouse,
  WorkOrderDetailsBundle,
  WorkOrderHubCounts,
  CreateIssueResponse,
  AddIssueLinesPayload,
  AddInstallationPayload,
  SaveQaPayload,
  CompleteWorkOrderPayload,
} from "@/src/types/work-order-details.types";

function extractArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.installations)) return body.installations;
  if (Array.isArray(body?.work_orders)) return body.work_orders;
  if (Array.isArray(body?.workOrders)) return body.workOrders;
  if (Array.isArray(body?.result)) return body.result;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  return [];
}

function extractTotal(body: any, fallback = 0): number {
  const raw =
    body?.meta?.total ??
    body?.total ??
    body?.count ??
    body?.data?.total ??
    body?.data?.count ??
    fallback;

  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const workOrderDetailsService = {
  async getById(id: string): Promise<WorkOrderByIdResponse> {
    const res = await api.get(`/maintenance/work-orders/${id}`);
    return (res.data ?? res) as WorkOrderByIdResponse;
  },

  async getReport(id: string): Promise<ReportResponse> {
    const res = await api.get(`/maintenance/work-orders/${id}/report`);
    return (res.data ?? res) as ReportResponse;
  },

  async getBundle(id: string): Promise<WorkOrderDetailsBundle> {
    const [woRes, repRes] = await Promise.all([
      this.getById(id),
      this.getReport(id),
    ]);

    return {
      workOrder: woRes?.work_order || null,
      report: repRes || null,
    };
  },

  async listWarehouses(): Promise<Warehouse[]> {
    const res = await api.get("/inventory/warehouses");
    const body = res.data ?? res;
    return extractArray(body) as Warehouse[];
  },

  async countRequests(workOrderId: string): Promise<number> {
    const res = await api.get("/inventory/requests", {
      params: { work_order_id: workOrderId, page: 1, limit: 1 },
    });
    const body = res.data ?? res;
    return extractTotal(body, 0);
  },

  async countIssues(workOrderId: string): Promise<number> {
    const res = await api.get("/inventory/issues", {
      params: { work_order_id: workOrderId, page: 1, limit: 1 },
    });
    const body = res.data ?? res;
    return extractTotal(body, 0);
  },

  async listInstallations(id: string): Promise<any[]> {
    const res = await api.get(`/maintenance/work-orders/${id}/installations`);
    const body = res.data ?? res;
    return extractArray(body);
  },

  async getHubCounts(workOrderId: string): Promise<WorkOrderHubCounts> {
    const [requests, issues, instArr] = await Promise.all([
      this.countRequests(workOrderId),
      this.countIssues(workOrderId),
      this.listInstallations(workOrderId),
    ]);

    return {
      requests,
      issues,
      installations: Array.isArray(instArr) ? instArr.length : 0,
    };
  },

  async createIssue(id: string, notes: string | null = null): Promise<CreateIssueResponse> {
    const res = await api.post(`/maintenance/work-orders/${id}/issues`, { notes });
    return (res.data ?? res) as CreateIssueResponse;
  },

  async addIssueLines(issueId: string, payload: AddIssueLinesPayload) {
    const res = await api.post(`/maintenance/issues/${issueId}/lines`, payload);
    return res.data ?? res;
  },

  async addInstallations(id: string, payload: AddInstallationPayload) {
    const res = await api.post(`/maintenance/work-orders/${id}/installations`, payload);
    return res.data ?? res;
  },

  async saveQa(id: string, payload: SaveQaPayload) {
    const res = await api.post(`/maintenance/work-orders/${id}/post-report`, payload);
    return res.data ?? res;
  },

  async complete(id: string, payload: CompleteWorkOrderPayload = { notes: null }) {
    const res = await api.post(`/maintenance/work-orders/${id}/complete`, payload);
    return res.data ?? res;
  },
  async createInventoryRequest(workOrderId: string, payload: any) {
  const res = await api.post(
    `/maintenance/work-orders/${workOrderId}/inventory-requests`,
    payload
  );
  return res.data;
},

async listInventoryRequests(workOrderId: string) {
  const res = await api.get(
    `/maintenance/work-orders/${workOrderId}/inventory-requests`
  );
  return res.data;
},

async addInventoryRequestLines(requestId: string, lines: any[]) {
  const res = await api.post(
    `/maintenance/inventory-requests/${requestId}/lines`,
    { lines }
  );
  return res.data;
},

};