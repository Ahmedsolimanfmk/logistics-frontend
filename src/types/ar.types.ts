export type ArInvoiceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export type ArPaymentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "POSTED"
  | "REJECTED"
  | "CANCELLED";

export type ArPaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "CARD"
  | "OTHER";

export interface ArClientLite {
  id: string;
  name?: string | null;
}

export interface ArContractLite {
  id: string;
  contract_no?: string | null;
  status?: string | null;
}

export interface ArTripLite {
  id: string;
  trip_code?: string | null;
  status?: string | null;
  financial_status?: string | null;
  scheduled_at?: string | null;
}

export interface ArInvoiceTripLine {
  id: string;
  invoice_id?: string | null;
  trip_id?: string | null;
  amount?: number | null;
  notes?: string | null;
  trips?: ArTripLite | null;
}

export interface ArInvoice {
  id: string;
  company_id?: string | null;
  client_id?: string | null;
  contract_id?: string | null;

  invoice_no?: string | null;
  issue_date?: string | null;
  due_date?: string | null;

  amount?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;

  status?: ArInvoiceStatus | string | null;
  notes?: string | null;
  rejection_reason?: string | null;

  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  clients?: ArClientLite | null;
  client_contracts?: ArContractLite | null;
  invoice_trip_lines?: ArInvoiceTripLine[] | null;

  lines_count?: number;
}

export interface ArInvoiceListResponse {
  items: ArInvoice[];
  total: number;
}

export interface ArInvoiceDetailsResponse {
  invoice: ArInvoice;
  totals: {
    allocated_posted: number;
    remaining: number;
  };
}

export interface CreateArInvoiceTripLinePayload {
  trip_id: string;
  amount: number;
  notes?: string | null;
}

export interface CreateArInvoicePayload {
  client_id: string;
  contract_id?: string;
  issue_date?: string;
  due_date?: string;
  amount?: number;
  vat_amount?: number;
  notes?: string;
  trip_lines?: CreateArInvoiceTripLinePayload[];
}

export interface RejectArInvoicePayload {
  rejection_reason: string;
}

export interface ArPayment {
  id: string;
  company_id?: string | null;
  client_id?: string | null;

  payment_date?: string | null;
  amount?: number | null;
  method?: ArPaymentMethod | string | null;
  reference?: string | null;
  notes?: string | null;

  status?: ArPaymentStatus | string | null;
  rejection_reason?: string | null;

  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  clients?: ArClientLite | null;
  client?: ArClientLite | null;
}

export interface ArPaymentListResponse {
  items: ArPayment[];
  total: number;
}

export interface ArPaymentAllocation {
  id: string;
  payment_id?: string | null;
  invoice_id?: string | null;
  amount_allocated?: number | null;
  created_at?: string | null;
  invoice?: {
    id: string;
    invoice_no?: string | null;
    status?: string | null;
    issue_date?: string | null;
    due_date?: string | null;
    total_amount?: number | null;
  } | null;
}

export interface ArPaymentDetailsResponse {
  payment: ArPayment | null;
  totals: {
    allocated: number;
    remaining: number;
  };
  allocations: ArPaymentAllocation[];
}

export interface CreateArPaymentPayload {
  client_id: string;
  payment_date?: string;
  amount: number;
  method: ArPaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export interface UpdateArPaymentDraftPayload {
  payment_date?: string;
  amount?: number;
  method?: ArPaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export interface RejectArPaymentPayload {
  rejection_reason: string;
}

export interface AllocateArPaymentPayload {
  invoice_id: string;
  amount: number;
}

export interface ArLedgerInvoice {
  id: string;
  invoice_no?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  remaining_amount?: number | null;
}

export interface ArClientLedgerResponse {
  client: ArClientLite | null;
  summary: {
    total_invoiced: number;
    total_paid: number;
    balance: number;
  };
  invoices: ArLedgerInvoice[];
}