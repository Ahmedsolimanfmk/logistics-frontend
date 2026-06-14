import { apiAuthGet, apiAuthPost, apiAuthPut, apiAuthPatch } from "@/src/lib/api";

export const superAdminService = {
  getSystemStats: async () => {
    return apiAuthGet("/admin/system-stats");
  },

  getCompanies: async () => {
    return apiAuthGet("/admin/companies");
  },

  getCompanyById: async (id: string) => {
    return apiAuthGet(`/admin/companies/${id}`);
  },

  getCompanyStats: async (id: string) => {
    return apiAuthGet(`/admin/companies/${id}/stats`);
  },

  getCompanyPayments: async (id: string) => {
    return apiAuthGet(`/admin/companies/${id}/payments`);
  },

  addCompanyPayment: async (id: string, payload: any) => {
    return apiAuthPost(`/admin/companies/${id}/payments`, payload);
  },

  addCompany: async (payload: any) => {
    return apiAuthPost("/admin/companies", payload);
  },

  updateCompany: async (id: string, payload: any) => {
    return apiAuthPut(`/admin/companies/${id}`, payload);
  },

  toggleCompanyStatus: async (id: string) => {
    return apiAuthPatch(`/admin/companies/${id}/toggle-status`, {});
  },

  updateFeatures: async (id: string, payload: any) => {
    return apiAuthPut(`/admin/companies/${id}/features`, payload);
  },

  updateSubscription: async (id: string, payload: any) => {
    return apiAuthPut(`/admin/companies/${id}/subscription`, payload);
  },

  impersonateCompany: async (companyId: string) => {
    return apiAuthPost(`/admin/impersonate/${companyId}`, {});
  },
};
