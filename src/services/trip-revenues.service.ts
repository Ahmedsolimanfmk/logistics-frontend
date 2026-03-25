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
  pricing_rule_id?: string | null;

  amount: string | number;
  currency?: string | null;
  source: TripRevenueSource;

  entered_by?: string | null;
  approved_by?: string | null;
  replaced_by?: string | null;

  entered_at?: string | null;
  approved_at?: string | null;
  replaced_at?: string | null;

  notes?: string | null;
  approval_notes?: string | null;

  is_current?: boolean;
  is_approved?: boolean;
  version_no?: number;

  pricing_rule_snapshot?: any;

  users_entered?: TripRevenueUser | null;
  users_approved?: TripRevenueUser | null;
  users_replaced?: TripRevenueUser | null;

  client_contracts?: {
    id: string;
    contract_no?: string | null;
    status?: string | null;
    currency?: string | null;
  } | null;

  ar_invoices?: {
    id: string;
    invoice_no?: string | null;
    status?: string | null;
    total_amount?: string | number | null;
  } | null;

  contract_pricing_rules?: {
    id: string;
    base_price?: string | number | null;
    currency?: string | null;
    priority?: number | null;
    is_active?: boolean | null;
  } | null;
}

export interface TripRevenueResponse {
  success: boolean;
  message?: string;
  data: TripRevenue | null;
}

export interface TripRevenueHistoryResponse {
  success: boolean;
  message?: string;
  data: TripRevenue[];
}

export interface SaveTripRevenuePayload {
  amount: number;
  currency?: string;
  source?: TripRevenueSource;
  contract_id?: string | null;
  invoice_id?: string | null;
  pricing_rule_id?: string | null;
  notes?: string | null;
}

export interface ApproveTripRevenuePayload {
  approval_notes?: string | null;
}

export interface TripProfitabilityExpenseItem {
  id: string;
  amount: string | number;
  payment_source?: string | null;
  expense_type?: string | null;
  approval_status?: string | null;
  created_at?: string | null;
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

  revenue_record:
    | {
        id: string;
        amount: string | number;
        currency?: string | null;
        source?: TripRevenueSource;
        entered_at?: string;
        approved_at?: string | null;
        notes?: string | null;
        is_approved?: boolean;
        version_no?: number;
        pricing_rule_id?: string | null;
        pricing_rule_snapshot?: any;
      }
    | null;

  current_revenue_record?: TripRevenue | null;
  current_approved_revenue_record?: TripRevenue | null;

  expenses_items?: TripProfitabilityExpenseItem[];
  pending_expenses_items?: TripProfitabilityExpenseItem[];
}

export interface TripProfitabilityResponse {
  success: boolean;
  message?: string;
  data: TripProfitability;
}

function asArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const tripRevenuesService = {
  async getByTrip(tripId: string): Promise<TripRevenueResponse> {
    const res = await api.get(`/trips/${tripId}/revenue`);
    return (res.data ?? res) as TripRevenueResponse;
  },

  async getHistory(tripId: string): Promise<TripRevenueHistoryResponse> {
    const res = await api.get(`/trips/${tripId}/revenue/history`);
    const body = res.data ?? res;

    if (Array.isArray(body)) {
      return { success: true, data: body as TripRevenue[] };
    }

    if (Array.isArray(body?.data)) {
      return {
        success: Boolean(body?.success ?? true),
        message: body?.message,
        data: body.data,
      };
    }

    if (Array.isArray(body?.items)) {
      return {
        success: Boolean(body?.success ?? true),
        message: body?.message,
        data: body.items,
      };
    }

    return {
      success: Boolean(body?.success ?? true),
      message: body?.message,
      data: asArray(body) as TripRevenue[],
    };
  },

  async getProfitability(tripId: string): Promise<TripProfitabilityResponse> {
    const res = await api.get(`/trips/${tripId}/profitability`);
    return (res.data ?? res) as TripProfitabilityResponse;
  },

  async save(
    tripId: string,
    payload: SaveTripRevenuePayload
  ): Promise<TripRevenueResponse> {
    const res = await api.put(`/trips/${tripId}/revenue`, payload);
    return (res.data ?? res) as TripRevenueResponse;
  },

  async approve(
    tripId: string,
    payload: ApproveTripRevenuePayload = {}
  ): Promise<TripRevenueResponse> {
    const res = await api.post(`/trips/${tripId}/revenue/approve`, payload);
    return (res.data ?? res) as TripRevenueResponse;
  },
};