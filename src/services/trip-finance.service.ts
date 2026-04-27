import { apiGet, apiPost } from "@/src/lib/api";

export type TripFinanceSummary = {
  trip_id: string;
  company_id?: string;
  financial_status?: string;

  revenue?: number;
  expenses?: number;
  pending_expenses?: number;

  company_expenses?: number;
  advance_expenses?: number;

  profit?: number;
  net_profit?: number;
  profit_status?: string;
  profit_margin?: number | null;

  currency?: string;

  revenue_record?: any;
  latest_revenue_record?: any;
  latest_approved_revenue_record?: any;

  breakdown_by_type?: Record<string, number>;

  expenses_items?: any[];
  pending_expenses_items?: any[];
};

function unwrapData<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

export const tripFinanceService = {
  async getSummary(tripId: string): Promise<TripFinanceSummary> {
    const res = await apiGet(`/trips/${tripId}/finance/summary`);
    return unwrapData<TripFinanceSummary>(res);
  },

  async openReview(tripId: string): Promise<any> {
    return apiPost(`/trips/${tripId}/finance/open-review`);
  },

  async close(tripId: string, notes?: string): Promise<any> {
    return apiPost(`/trips/${tripId}/finance/close`, {
      notes: notes || null,
    });
  },

  async refresh(tripId: string): Promise<TripFinanceSummary> {
    const res = await apiGet(`/trips/${tripId}/finance/summary`);
    return unwrapData<TripFinanceSummary>(res);
  },
};