import { api } from "@/src/lib/api";

export type TripRevenueSource = "MANUAL" | "CONTRACT" | "INVOICE";

export interface TripRevenueUser {
  id: string;
  full_name: string;
  email?: string | null;
  role?: string | null;
}

export interface TripRevenue {
  id: string;
  trip_id: string;
  client_id: string;
  contract_id?: string | null;
  invoice_id?: string | null;

  amount: string | number;
  currency?: string | null;
  source: TripRevenueSource;

  entered_by?: string | null;
  approved_by?: string | null;
  entered_at: string;
  approved_at?: string | null;

  notes?: string | null;

  users_entered?: TripRevenueUser | null;
  users_approved?: TripRevenueUser | null;
}

export interface TripRevenueResponse {
  success: boolean;
  message?: string;
  data: TripRevenue | null;
}

export interface SaveTripRevenuePayload {
  trip_id: string;
  amount: number;
  currency?: string;
  source?: TripRevenueSource;
  contract_id?: string | null;
  invoice_id?: string | null;
  notes?: string | null;
}

export interface TripProfitability {
  trip_id: string;
  financial_status: string;
  revenue: number;
  expenses: number;
  advances: number;
  profit: number;
  currency?: string | null;
  revenue_record: {
    id: string;
    amount: string | number;
    currency?: string | null;
    source?: TripRevenueSource;
    entered_at?: string;
    approved_at?: string | null;
    notes?: string | null;
  } | null;
}

export interface TripProfitabilityResponse {
  success: boolean;
  message?: string;
  data: TripProfitability;
}

export const tripRevenuesService = {
  async getByTrip(tripId: string): Promise<TripRevenueResponse> {
    const res = await api.get(`/trip-revenues/${tripId}`);
    return res.data;
  },

  async getProfitability(tripId: string): Promise<TripProfitabilityResponse> {
    const res = await api.get(`/trip-revenues/${tripId}/profitability`);
    return res.data;
  },

  async save(payload: SaveTripRevenuePayload): Promise<TripRevenueResponse> {
    const res = await api.post("/trip-revenues", payload);
    return res.data;
  },
};