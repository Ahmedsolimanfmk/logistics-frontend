import { api } from "@/src/lib/api";

export const driversService = {
  async getDrivers(params?: Record<string, any>) {
    const res = await api.get("/drivers", { params });
    return res.data ?? res;
  },

  async getActiveDrivers(params?: Record<string, any>) {
    const res = await api.get("/drivers/active", { params });
    return res.data ?? res;
  },

  async getDriverById(id: string) {
    const res = await api.get(`/drivers/${id}`);
    return res.data ?? res;
  },

  async createDriver(data: any) {
    const res = await api.post("/drivers", data);
    return res.data ?? res;
  },

  async updateDriver(id: string, data: any) {
    const res = await api.patch(`/drivers/${id}`, data);
    return res.data ?? res;
  },

  async setDriverStatus(id: string, status: string, disable_reason?: string) {
    const res = await api.patch(`/drivers/${id}/status`, { status, disable_reason });
    return res.data ?? res;
  },

  async getDriverFinancialSummary(id: string) {
    const res = await api.get(`/drivers/${id}/financial-summary`);
    return res.data ?? res;
  }
};
