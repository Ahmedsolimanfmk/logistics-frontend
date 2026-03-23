export interface TripFinanceTripInfo {
  id?: string;
  trip_code?: string;
  code?: string;
  status?: string;
  finance_status?: string;
  financial_status?: string;
  finance_closed_at?: string | null;
  financial_closed_at?: string | null;
}

export interface TripFinanceExpense {
  id: string;
  amount: number | string;
  expense_type?: string | null;
  payment_source?: string | null;
  approval_status?: string | null;
  created_at?: string | null;
}

export interface TripFinanceAdvance {
  id: string;
  amount: number | string;
  status?: string | null;
}

export interface TripFinanceTotals {
  expenses_total?: number;
  advances_total?: number;
  company_total?: number;
  parts_cost?: number;
  maintenance_total?: number;
  balance?: number;
}

export interface TripFinanceSummary {
  trip?: TripFinanceTripInfo;
  note?: string | null;

  finance_status?: string;
  financial_status?: string;

  totals?: TripFinanceTotals;

  expenses_total?: number;
  total_expenses?: number;

  advances_total?: number;
  total_advances?: number;

  company_total?: number;
  total_company?: number;

  parts_cost?: number;
  total_parts_cost?: number;

  maintenance_total?: number;

  balance?: number;

  expenses?: TripFinanceExpense[];
  advances?: TripFinanceAdvance[];
  cash_advances?: TripFinanceAdvance[];

  revenue?: number;
  profit?: number;
  currency?: string | null;
}