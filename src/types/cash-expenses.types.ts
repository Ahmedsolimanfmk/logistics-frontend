export type CashExpensePaymentSource = "ADVANCE" | "COMPANY";

export type CashExpenseApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPEALED"
  | "RESOLVED"
  | "REAPPROVED";

export type CashExpenseAppealStatus = "OPEN" | "ACCEPTED" | "REJECTED" | null;

export type CashExpenseListStatusFilter =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPEALED"
  | "ALL";

export interface CashExpenseVendor {
  id: string;
  name?: string | null;
  code?: string | null;
  vendor_type?: string | null;
  classification?: string | null;
  status?: string | null;
}

export interface CashExpenseVehicle {
  id: string;
  plate_no?: string | null;
  plate_number?: string | null;
}

export interface CashExpenseTrip {
  id: string;
  code?: string | null;
  financial_status?: string | null;
}

export interface CashExpenseAdvance {
  id: string;
  amount?: number | null;
  status?: string | null;
  field_supervisor_id?: string | null;
}

export interface CashExpenseWorkOrder {
  id: string;
  code?: string | null;
  vehicle_id?: string | null;
  vendor_id?: string | null;
}

export interface CashExpenseUser {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface CashExpense {
  id: string;
  payment_source?: CashExpensePaymentSource | string | null;
  approval_status?: CashExpenseApprovalStatus | string | null;
  status?: string | null;

  cash_advance_id?: string | null;
  trip_id?: string | null;
  vehicle_id?: string | null;
  maintenance_work_order_id?: string | null;
  vendor_id?: string | null;

  expense_type?: string | null;
  amount?: number | null;
  notes?: string | null;
  receipt_url?: string | null;

  vendor_name?: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  paid_method?: string | null;
  payment_ref?: string | null;
  vat_amount?: number | null;
  invoice_total?: number | null;

  created_by?: string | null;
  approved_by?: string | null;
  rejected_by?: string | null;
  resolved_by?: string | null;
  appealed_by?: string | null;

  created_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  resolved_at?: string | null;
  appealed_at?: string | null;

  rejection_reason?: string | null;
  appeal_reason?: string | null;
  appeal_status?: CashExpenseAppealStatus;

  cash_advances?: CashExpenseAdvance | null;
  trips?: CashExpenseTrip | null;
  vehicles?: CashExpenseVehicle | null;
  maintenance_work_orders?: CashExpenseWorkOrder | null;
  vendors?: CashExpenseVendor | null;

  users_cash_expenses_created_byTousers?: CashExpenseUser | null;
  users_cash_expenses_approved_byTousers?: CashExpenseUser | null;
  users_cash_expenses_rejected_byTousers?: CashExpenseUser | null;
  users_cash_expenses_resolved_byTousers?: CashExpenseUser | null;
}

export interface CashExpenseAuditItem {
  id: string;
  expense_id?: string | null;
  action?: string | null;
  actor_id?: string | null;
  notes?: string | null;
  before?: string | null;
  after?: string | null;
  created_at?: string | null;
}

export interface CashExpenseListParams {
  status?: CashExpenseListStatusFilter;
  payment_source?: CashExpensePaymentSource;
  q?: string;
  vendor_id?: string;
  page?: number;
  page_size?: number;
}

export interface CashExpenseListResponse {
  items: CashExpense[];
  total: number;
  page: number;
  page_size: number;
}

export interface CashExpenseSummaryTotals {
  sumAll: number;
  countAll: number;
  sumApproved: number;
  countApproved: number;
  sumPending: number;
  countPending: number;
  sumRejected: number;
  countRejected: number;
  sumAppealed: number;
  countAppealed: number;
  sumResolved: number;
  countResolved: number;
}

export interface CashExpenseSummaryResponse {
  totals: CashExpenseSummaryTotals;
}

export interface CashExpenseAuditResponse {
  items: CashExpenseAuditItem[];
  note?: string | null;
}

export interface CreateCashExpensePayload {
  payment_source: CashExpensePaymentSource;
  expense_type: string;
  amount: number;
  notes?: string;

  cash_advance_id?: string;

  vendor_id?: string;
  vendor_name?: string;
  invoice_no?: string;
  invoice_date?: string;

  maintenance_work_order_id?: string;
  trip_id?: string;
  vehicle_id?: string;
}

export interface ApproveCashExpensePayload {
  notes?: string | null;
}

export interface RejectCashExpensePayload {
  reason: string;
  notes?: string | null;
}

export interface AppealCashExpensePayload {
  notes: string;
}

export interface ResolveAppealPayload {
  decision: "APPROVE" | "REJECT";
  notes?: string | null;
  reason?: string | null;
}

export interface ReopenCashExpensePayload {
  notes?: string | null;
}