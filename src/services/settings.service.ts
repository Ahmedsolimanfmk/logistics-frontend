import { api } from "@/src/lib/api";

export const settingsService = {
  async listSettings(): Promise<any[]> {
    const res = await api.get("/companies/me/settings");
    return res.data?.items ?? (res as any).items ?? [];
  },

  // Save a setting
  async upsertSetting(settingKey: string, settingValue: any): Promise<any> {
    const res = await api.put("/companies/me/settings", {
      setting_key: settingKey,
      setting_value: settingValue,
    });
    return res.data ?? res;
  },

  // Delete a setting
  async deleteSetting(settingKey: string): Promise<any> {
    const res = await api.delete(`/companies/me/settings/${settingKey}`);
    return res.data ?? res;
  },

  // Get current company profile
  async getCurrentCompany(): Promise<any> {
    const res = await api.get("/companies/me");
    return res.data?.data ?? res.data ?? res;
  },

  // Update company profile
  async updateCurrentCompany(payload: any): Promise<any> {
    const res = await api.patch("/companies/me", payload);
    return res.data?.data ?? res.data ?? res;
  },
};
