import { apiAuthGet } from "@/src/lib/api";

function unwrap(res: any) {
  return res?.data ?? res;
}

export const dashboardService = {
  async getDashboardData(range = "this_month") {
    const [
      tripsSummary,
      tripsTop,
      tripsWorst,
      tripsLowMargin,
      alertsSummary,
    ] = await Promise.all([
      apiAuthGet("/analytics/trips/summary", { range }),
      apiAuthGet("/analytics/profit/trips/top", { range, limit: 5 }),
      apiAuthGet("/analytics/profit/trips/worst", { range, limit: 5 }),
      apiAuthGet("/analytics/profit/trips/low-margin", {
        range,
        limit: 5,
        threshold: 10,
      }),
      apiAuthGet("/dashboard/alerts/summary"),
    ]);

    return {
      tripsSummary: unwrap(tripsSummary),
      tripsTop: unwrap(tripsTop)?.data?.items || [],
      tripsWorst: unwrap(tripsWorst)?.data?.items || [],
      tripsLowMargin: unwrap(tripsLowMargin)?.data?.items || [],
      alertsSummary: unwrap(alertsSummary),
    };
  },
};