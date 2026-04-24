import { api } from "@/src/lib/api";

export type UUID = string;

// =====================
// Types
// =====================
export type WorkOrder = {
  id: UUID;
  request_id: UUID;
  vehicle_id: UUID;
  status: string;
  created_at: string;
  updated_at: string;
};

export type WorkOrderReport = {
  id: UUID;
  work_order_id: UUID;
  notes?: string;
  total_cost?: number;
};

export type IssueLine = {
  part_id: UUID;
  qty: number;
};

export type InstallationLine = {
  part_id: UUID;
  qty: number;
};

// =====================
// Helpers
// =====================
function qs(params?: Record<string, any>) {
  if (!params) return "";
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      sp.append(k, String(v));
    }
  });

  const s = sp.toString();
  return s ? `?${s}` : "";
}

// =====================
// Service
// =====================
export const workOrdersService = {
  // =====================
  // Work Orders
  // =====================
  async list(params?: any) {
    const res = await api.get(`/maintenance/work-orders${qs(params)}`);
    return res.data;
  },

  async getById(id: UUID) {
    const res = await api.get(`/maintenance/work-orders/${id}`);
    return res.data;
  },

  // =====================
  // Report
  // =====================
  async getReport(id: UUID) {
    const res = await api.get(`/maintenance/work-orders/${id}/report`);
    return res.data;
  },

  async saveReport(id: UUID, payload: any) {
    const res = await api.post(
      `/maintenance/work-orders/${id}/post-report`,
      payload
    );
    return res.data;
  },

  // =====================
  // Complete
  // =====================
  async complete(id: UUID) {
    const res = await api.post(
      `/maintenance/work-orders/${id}/complete`
    );
    return res.data;
  },

  // =====================
  // Inventory Issues
  // =====================
  async createIssue(workOrderId: UUID) {
    const res = await api.post(
      `/maintenance/work-orders/${workOrderId}/issues`
    );
    return res.data;
  },

  async addIssueLines(issueId: UUID, lines: IssueLine[]) {
    const res = await api.post(
      `/maintenance/issues/${issueId}/lines`,
      { lines }
    );
    return res.data;
  },

  // =====================
  // Installations
  // =====================
  async listInstallations(workOrderId: UUID) {
    const res = await api.get(
      `/maintenance/work-orders/${workOrderId}/installations`
    );
    return res.data;
  },

  // 🔥 FIXED هنا
  async addInstallations(
    workOrderId: UUID,
    items: InstallationLine[]
  ) {
    const res = await api.post(
      `/maintenance/work-orders/${workOrderId}/installations`,
      { items } // ✅ الصحيح
    );
    return res.data;
  },
};

export default workOrdersService;