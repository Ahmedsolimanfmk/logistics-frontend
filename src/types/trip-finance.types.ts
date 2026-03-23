export type TripFinanceStatus = "OPEN" | "UNDER_REVIEW" | "CLOSED" | string;
export type TripProfitStatus = "PROFIT" | "LOSS" | "BREAK_EVEN" | string;

export interface TripRevenueRecord {
  id: string;
  amount: number | string;
  currency?: string | null;
  source?: string | null;
  entered_at?: string | null;
  approved_at?: string | null;
  notes?: string | null;
}

export interface TripFinanceSummary {
  trip_id: string;
  financial_status: TripFinanceStatus;

  revenue: number;
  expenses: number;
  pending_expenses: number;

  company_expenses: number;
  advance_expenses: number;

  profit: number;
  profit_status: TripProfitStatus;

  currency?: string | null;
  revenue_record?: TripRevenueRecord | null;

  breakdown_by_type?: Record<string, number>;
}

export interface TripFinanceSummaryResponse {
  success: boolean;
  message?: string;
  data: TripFinanceSummary;
}

export interface TripFinanceActionResponse {
  success?: boolean;
  message?: string;
  trip?: {
    id?: string;
    financial_status?: string;
    status?: string;
  };
}