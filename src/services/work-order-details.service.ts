import { api } from "@/src/lib/api";

export type UUID = string;

export const workOrderDetailsService = {
  // ======================
  // Bundle
  // ======================
  async getBundle(id: UUID) {
    const res = await api.get(`/maintenance/work-orders/${id}/report`);
    return res.data;
  },

  // ======================
  // Installations
  // ======================
  async listInstallations(workOrderId: UUID) {
    const res = await api.get(
      `/maintenance/work-orders/${workOrderId}/installations`
    );
    return res.data;
  },

  async addInstallations(workOrderId: UUID, payload: { items: any[] }) {
    const res = await api.post(
      `/maintenance/work-orders/${workOrderId}/installations`,
      payload
    );
    return res.data;
  },

  // ======================
  // QA Report
  // ======================
  async saveQa(id: UUID, payload: any) {
    const res = await api.post(
      `/maintenance/work-orders/${id}/post-report`,
      payload
    );
    return res.data;
  },

  // ======================
  // Complete
  // ======================
  async complete(id: UUID, payload?: any) {
    const res = await api.post(
      `/maintenance/work-orders/${id}/complete`,
      payload || {}
    );
    return res.data;
  },

  // ======================
  // 🔥 Inventory Request (الجديد)
  // ======================
  async createInventoryRequest(workOrderId: UUID, payload: any) {
    const res = await api.post(
      `/maintenance/work-orders/${workOrderId}/inventory-requests`,
      payload
    );
    return res.data;
  },

  async listInventoryRequests(workOrderId: UUID) {
    const res = await api.get(
      `/maintenance/work-orders/${workOrderId}/inventory-requests`
    );
    return res.data;
  },

  async addInventoryRequestLines(requestId: UUID, lines: any[]) {
    const res = await api.post(
      `/maintenance/inventory-requests/${requestId}/lines`,
      { lines }
    );
    return res.data;
  },
};

export default workOrderDetailsService;