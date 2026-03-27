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
  is_approved?: boolean;
  version_no?: number | null;
  pricing_rule_id?: string | null;
  pricing_rule_snapshot?: any;
}

export interface TripFinanceExpenseItem {
  id: string;
  amount: number | string;
  expense_type?: string | null;
  payment_source?: string | null;
  approval_status?: string | null;
  created_at?: string | null;
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
  current_revenue_record?: TripRevenueRecord | null;
  current_approved_revenue_record?: TripRevenueRecord | null;

  breakdown_by_type?: Record<string, number>;

  expenses_items?: TripFinanceExpenseItem[];
  pending_expenses_items?: TripFinanceExpenseItem[];
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