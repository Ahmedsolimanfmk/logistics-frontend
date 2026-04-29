import { apiAuthGet, apiAuthPatch } from "@/src/lib/api";

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

export const dashboardService = {
  async getSummary(tab?: string) {
    return unwrap(
      await apiAuthGet("/dashboard/summary", tab ? { tab } : undefined)
    );
  },

  async getTrends(metric: string, bucket = "daily") {
    return unwrap(
      await apiAuthGet("/dashboard/trends", { metric, bucket })
    );
  },

  async getTrendsBundle(bucket = "daily") {
    return unwrap(
      await apiAuthGet("/dashboard/trends/bundle", { bucket })
    );
  },

  async getComplianceAlerts(days = 30, limit = 20) {
    return unwrap(
      await apiAuthGet("/dashboard/compliance-alerts", { days, limit })
    );
  },

  async getAlerts(limit = 10, params: Record<string, any> = {}) {
    return unwrap(
      await apiAuthGet("/dashboard/alerts", {
        limit,
        ...params,
      })
    );
  },

  async getAlertsSummary(params: Record<string, any> = {}) {
    return unwrap(
      await apiAuthGet("/dashboard/alerts/summary", params)
    );
  },

  async markAlertRead(alert_key: string) {
    return unwrap(
      await apiAuthPatch("/dashboard/alerts/read", { alert_key })
    );
  },

  async markAllAlertsRead(area?: string | null) {
    return unwrap(
      await apiAuthPatch("/dashboard/alerts/read-all", area ? { area } : {})
    );
  },

  // optional helper للـ Trip Intelligence القديم لو احتجناه
  async getDashboardData(range = "this_month") {
    const [
      tripsSummary,
      tripsTop,
      tripsWorst,
      tripsLowMargin,
      alertsSummary,
    ] = await Promise.all([
      apiAuthGet("/analytics/profit/trips/summary", { range }),
      apiAuthGet("/analytics/profit/trips/top", { range, limit: 5 }),
      apiAuthGet("/analytics/profit/trips/worst", { range, limit: 5 }),
      apiAuthGet("/analytics/profit/trips/low-margin", {
        range,
        limit: 5,
        threshold: 10,
      }),
      apiAuthGet("/dashboard/alerts/summary"),
    ]);

    const pickItems = (res: any) => {
      const body = unwrap<any>(res);
      return body?.data?.items || body?.items || [];
    };

    return {
      tripsSummary: unwrap(tripsSummary),
      tripsTop: pickItems(tripsTop),
      tripsWorst: pickItems(tripsWorst),
      tripsLowMargin: pickItems(tripsLowMargin),
      alertsSummary: unwrap(alertsSummary),
    };
  },
};

export default dashboardService;