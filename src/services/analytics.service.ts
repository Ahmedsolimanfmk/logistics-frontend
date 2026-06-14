import { api } from "@/src/lib/api";

export const analyticsService = {
  // =======================
  // Finance
  // =======================
  async getFinanceExpenseSummary(params?: any) {
    const res = await api.get("/analytics/finance/expense-summary", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getFinanceExpenseByType(params?: any) {
    const res = await api.get("/analytics/finance/expense-by-type", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getFinanceExpenseByVehicle(params?: any) {
    const res = await api.get("/analytics/finance/expense-by-vehicle", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getFinanceExpenseByPaymentSource(params?: any) {
    const res = await api.get("/analytics/finance/expense-by-payment-source", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getFinanceTopVendors(params?: any) {
    const res = await api.get("/analytics/finance/top-vendors", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getFinanceExpenseApprovalBreakdown(params?: any) {
    const res = await api.get("/analytics/finance/expense-approval-breakdown", { params });
    return res.data?.data ?? res.data ?? res;
  },

  // =======================
  // AR
  // =======================
  async getArOutstandingSummary(params?: any) {
    const res = await api.get("/analytics/ar/outstanding-summary", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getArTopDebtors(params?: any) {
    const res = await api.get("/analytics/ar/top-debtors", { params });
    return res.data?.data ?? res.data ?? res;
  },

  // =======================
  // Maintenance
  // =======================
  async getMaintenanceOpenWorkOrders(params?: any) {
    const res = await api.get("/analytics/maintenance/open-work-orders", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getMaintenanceCostByVehicle(params?: any) {
    const res = await api.get("/analytics/maintenance/cost-by-vehicle", { params });
    return res.data?.data ?? res.data ?? res;
  },

  // =======================
  // Inventory
  // =======================
  async getInventoryTopIssuedParts(params?: any) {
    const res = await api.get("/analytics/inventory/top-issued-parts", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getInventoryLowStockItems(params?: any) {
    const res = await api.get("/analytics/inventory/low-stock-items", { params });
    return res.data?.data ?? res.data ?? res;
  },

  // =======================
  // Trips
  // =======================
  async getTripsSummary(params?: any) {
    const res = await api.get("/analytics/trips/summary", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getActiveTrips(params?: any) {
    const res = await api.get("/analytics/trips/active", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getTripsNeedingFinancialClosure(params?: any) {
    const res = await api.get("/analytics/trips/need-financial-closure", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getTopClientsByTrips(params?: any) {
    const res = await api.get("/analytics/trips/top-clients", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getTopSitesByTrips(params?: any) {
    const res = await api.get("/analytics/trips/top-sites", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getTopVehiclesByTrips(params?: any) {
    const res = await api.get("/analytics/trips/top-vehicles", { params });
    return res.data?.data ?? res.data ?? res;
  },

  // =======================
  // Profit
  // =======================
  async getEntityProfitSummary(params?: any) {
    const res = await api.get("/analytics/profit/client-summary", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getTripsProfitSummary(params?: any) {
    const res = await api.get("/analytics/profit/trips/summary", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getTopProfitableTrips(params?: any) {
    const res = await api.get("/analytics/profit/trips/top", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getWorstTrips(params?: any) {
    const res = await api.get("/analytics/profit/trips/worst", { params });
    return res.data?.data ?? res.data ?? res;
  },
  async getLowMarginTrips(params?: any) {
    const res = await api.get("/analytics/profit/trips/low-margin", { params });
    return res.data?.data ?? res.data ?? res;
  },
};
