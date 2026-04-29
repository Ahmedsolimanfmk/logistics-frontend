import { apiAuthGet } from "@/src/lib/api";

export type TripProfitRow = {
  trip_id: string;
  trip_code?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  site_id?: string | null;
  site_name?: string | null;
  status?: string | null;
  financial_status?: string | null;
  created_at?: string | null;
  revenue: number;
  expense: number;
  profit: number;
  margin_pct: number | null;
  cargo_weight?: number | null;
  currency?: string | null;
};

export type TripsProfitSummary = {
  total_trips: number;
  profitable_count: number;
  loss_count: number;
  break_even_count: number;
  total_revenue: number;
  total_expense: number;
  total_profit: number;
  margin_pct: number | null;
};

function unwrap(res: any) {
  return res?.data ?? res;
}

function pickData(res: any) {
  const body = unwrap(res);
  return body?.data ?? body;
}

function pickItems(res: any): TripProfitRow[] {
  const data = pickData(res);
  return Array.isArray(data?.items) ? data.items : [];
}

export const tripIntelligenceService = {
  async getSummary(range = "this_month"): Promise<TripsProfitSummary> {
    const res = await apiAuthGet("/analytics/profit/trips/summary", { range });
    return pickData(res);
  },

  async getTopProfitableTrips(
    range = "this_month",
    limit = 5
  ): Promise<TripProfitRow[]> {
    const res = await apiAuthGet("/analytics/profit/trips/top", {
      range,
      limit,
    });
    return pickItems(res);
  },

  async getWorstTrips(
    range = "this_month",
    limit = 5
  ): Promise<TripProfitRow[]> {
    const res = await apiAuthGet("/analytics/profit/trips/worst", {
      range,
      limit,
    });
    return pickItems(res);
  },

  async getLowMarginTrips(
    range = "this_month",
    limit = 5,
    threshold = 10
  ): Promise<TripProfitRow[]> {
    const res = await apiAuthGet("/analytics/profit/trips/low-margin", {
      range,
      limit,
      threshold,
    });
    return pickItems(res);
  },
};

export default tripIntelligenceService;