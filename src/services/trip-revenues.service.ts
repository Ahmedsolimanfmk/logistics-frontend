import { api } from "@/src/lib/api";

export type TripRevenueSource = "MANUAL" | "CONTRACT" | "INVOICE" | string;

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
  pending_expenses?: number;
  company_expenses?: number;
  advance_expenses?: number;
  profit: number;
  profit_status?: "PROFIT" | "LOSS" | "BREAK_EVEN" | string;
  currency?: string | null;
  breakdown_by_type?: Record<string, number>;
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
    const res = await api.get(`/trips/${tripId}/revenue`);
    return (res.data ?? res) as TripRevenueResponse;
  },

  async getProfitability(tripId: string): Promise<TripProfitabilityResponse> {
    const res = await api.get(`/trips/${tripId}/profitability`);
    return (res.data ?? res) as TripProfitabilityResponse;
  },

  async save(tripId: string, payload: SaveTripRevenuePayload): Promise<TripRevenueResponse> {
    const res = await api.put(`/trips/${tripId}/revenue`, payload);
    return (res.data ?? res) as TripRevenueResponse;
  },
};