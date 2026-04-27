import { apiGet, apiPost, apiPatch } from "@/src/lib/api";

export type TripRevenue = {
  id: string;
  company_id?: string;
  trip_id?: string;
  client_id?: string;
  contract_id?: string | null;
  invoice_id?: string | null;
  pricing_rule_id?: string | null;

  amount?: number;
  currency?: string;
  source?: string;
  status?: string;

  is_current?: boolean;
  is_approved?: boolean;

  entered_at?: string;
  approved_at?: string | null;
  notes?: string | null;

  [key: string]: any;
};

export type TripRevenueHistoryItem = TripRevenue;

export type TripProfitability = {
  trip_id?: string;
  revenue?: number;
  expenses?: number;
  profit?: number;
  net_profit?: number;
  profit_status?: string;
  profit_margin?: number | null;
  currency?: string;
  [key: string]: any;
};

function unwrapData<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

export const tripRevenuesService = {
  async getByTrip(tripId: string): Promise<TripRevenue | null> {
    try {
      const res = await apiGet(`/trip-revenues/${tripId}/revenue`);
      return unwrapData<TripRevenue | null>(res);
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  async getHistory(tripId: string): Promise<TripRevenueHistoryItem[]> {
    const res = await apiGet(`/trip-revenues/${tripId}/revenue/history`);
    const data = unwrapData<any>(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

 async save(tripId: string, payload: any): Promise<TripRevenue> {
  const res = await apiPatch(`/trip-revenues/${tripId}/revenue`, payload);
  return unwrapData<TripRevenue>(res);
},

  async approve(tripId: string, payload?: any): Promise<TripRevenue> {
    const res = await apiPost(
      `/trip-revenues/${tripId}/revenue/approve`,
      payload || {}
    );
    return unwrapData<TripRevenue>(res);
  },

  async getProfitability(tripId: string): Promise<TripProfitability> {
    const res = await apiGet(`/trip-revenues/${tripId}/profitability`);
    return unwrapData<TripProfitability>(res);
  },

  async autoPrice(tripId: string, payload?: any): Promise<any> {
    return apiPost(`/trips/${tripId}/auto-price`, payload || {});
  },
};