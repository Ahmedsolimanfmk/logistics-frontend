import type { CashExpense } from "@/src/types/cash-expenses.types";

export type CashAdvanceStatus = "OPEN" | "SETTLED" | "CANCELLED" | "CANCELED" | "ALL";

export type CashAdvanceSettlementType = "FULL" | "PARTIAL" | "ADJUSTED" | "CANCELLED";

export interface CashAdvanceUser {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface CashAdvance {
  id: string;
  amount?: number | null;
  status?: string | null;

  field_supervisor_id?: string | null;
  issued_by?: string | null;
  settled_by?: string | null;

  settlement_type?: CashAdvanceSettlementType | string | null;
  settlement_amount?: number | null;
  settlement_reference?: string | null;
  settlement_notes?: string | null;

  created_at?: string | null;
  settled_at?: string | null;

  users_cash_advances_field_supervisor_idTousers?: CashAdvanceUser | null;
  users_cash_advances_issued_byTousers?: CashAdvanceUser | null;

  cash_expenses?: CashExpense[] | null;
}

export interface CashAdvanceListParams {
  status?: CashAdvanceStatus;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface CashAdvanceListResponse {
  items: CashAdvance[];
  total: number;
  page: number;
  page_size: number;
}

export interface CashAdvanceSummaryTotals {
  sumAmount: number;
  countAll: number;
  openCount: number;
  settledCount: number;
  canceledCount: number;
}

export interface CashAdvanceSummaryResponse {
  totals: CashAdvanceSummaryTotals;
}

export interface CreateCashAdvancePayload {
  field_supervisor_id: string;
  amount: number;
}

export interface CloseCashAdvancePayload {
  settlement_type: CashAdvanceSettlementType;
  amount: number;
  reference?: string | null;
  notes?: string | null;
}

export interface ReopenCashAdvancePayload {
  notes?: string | null;
}