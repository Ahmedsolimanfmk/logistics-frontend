export type TripFinanceStatus = "OPEN" | "IN_REVIEW" | "CLOSED" | string;

export type TripFinanceSummary = {
  finance_status?: TripFinanceStatus;
  financial_status?: TripFinanceStatus;

  trip?: {
    id?: string;
    code?: string | null;
    trip_code?: string | null;
    status?: string | null;
    financial_status?: string | null;
    finance_status?: string | null;
    financial_closed_at?: string | null;
    finance_closed_at?: string | null;
  } | null;

  totals?: {
    expenses_total?: number;
    advances_total?: number;
    company_total?: number;
    parts_cost?: number;
    maintenance_total?: number;
    balance?: number;
  } | null;

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

  expenses?: any[];
  advances?: any[];
  cash_advances?: any[];

  note?: string | null;
};