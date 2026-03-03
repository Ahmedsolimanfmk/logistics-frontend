// src/lib/ar.api.ts
import { apiGet, apiPost, apiPatch, apiDelete } from "@/src/lib/api";

export type ArInvoiceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export type ArPaymentStatus = "DRAFT" | "SUBMITTED" | "POSTED" | "REJECTED";

export type ArInvoice = {
  id: string;
  invoice_no: string;
  client_id: string;
  contract_id?: string | null;
  issue_date: string;
  due_date?: string | null;
  amount: number;
  vat_amount: number;
  total_amount: number;
  status: ArInvoiceStatus;
  notes?: string | null;
  created_at: string;
  clients?: { id: string; name: string } | null;
  client_contracts?: { id: string; contract_no: string } | null;
};

export type ArPayment = {
  id: string;
  client_id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
  status: ArPaymentStatus;
  created_at: string;
  clients?: { id: string; name: string } | null;
};

export type ArPaymentAllocation = {
  id: string;
  payment_id: string;
  invoice_id: string;
  amount_allocated: number;
  created_at: string;
  invoice?: {
    id: string;
    invoice_no: string;
    status: ArInvoiceStatus;
    issue_date: string;
    due_date?: string | null;
    total_amount: number;
  } | null;
};

export type ArPaymentDetails = {
  payment: {
    id: string;
    client_id: string;
    client?: { id: string; name: string } | null;
    payment_date: string;
    amount: number;
    method: string;
    reference?: string | null;
    notes?: string | null;
    status: ArPaymentStatus;
    created_at: string;
    approved_by?: string | null;
    approved_at?: string | null;
    rejection_reason?: string | null;
  };
  totals: { allocated: number; remaining: number };
  allocations: ArPaymentAllocation[];
};

export type ArLedgerResponse = {
  client: { id: string; name: string };
  summary: { total_invoiced: number; total_paid: number; balance: number };
  invoices: Array<{
    id: string;
    invoice_no: string;
    issue_date: string;
    due_date?: string | null;
    status: ArInvoiceStatus;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
  }>;
};

const base = "/finance/ar";

// ---------- Invoices ----------
export async function listArInvoices(): Promise<{ items: ArInvoice[]; total: number }> {
  return apiGet(`${base}/invoices`);
}

export async function createArInvoice(payload: {
  client_id: string;
  contract_id?: string | null;
  issue_date?: string;
  due_date?: string | null;
  amount: number;
  vat_amount?: number;
  notes?: string | null;
  source_trip_id?: string | null;
}): Promise<ArInvoice> {
  return apiPost(`${base}/invoices`, payload);
}

export async function submitArInvoice(id: string) {
  return apiPatch(`${base}/invoices/${id}/submit`);
}

export async function approveArInvoice(id: string) {
  return apiPatch(`${base}/invoices/${id}/approve`);
}

export async function rejectArInvoice(id: string, rejection_reason: string) {
  return apiPatch(`${base}/invoices/${id}/reject`, { rejection_reason });
}

// ---------- Payments ----------
export async function listArPayments(): Promise<{ items: ArPayment[]; total: number }> {
  return apiGet(`${base}/payments`);
}

export async function createArPayment(payload: {
  client_id: string;
  payment_date?: string;
  amount: number;
  method?: string;
  reference?: string | null;
  notes?: string | null;
}): Promise<ArPayment> {
  return apiPost(`${base}/payments`, payload);
}

export async function submitArPayment(id: string) {
  return apiPatch(`${base}/payments/${id}/submit`);
}

export async function approveArPayment(id: string) {
  return apiPatch(`${base}/payments/${id}/approve`);
}

export async function rejectArPayment(id: string, rejection_reason: string) {
  return apiPatch(`${base}/payments/${id}/reject`, { rejection_reason });
}

export async function updateArPaymentDraft(
  id: string,
  payload: {
    payment_date?: string;
    amount?: number;
    method?: string;
    reference?: string | null;
    notes?: string | null;
  }
) {
  return apiPatch(`${base}/payments/${id}`, payload);
}

export async function allocateArPayment(id: string, payload: { invoice_id: string; amount: number }) {
  return apiPost(`${base}/payments/${id}/allocate`, payload);
}

export async function deleteArPaymentAllocation(paymentId: string, allocationId: string) {
  // ✅ DELETE /finance/ar/payments/:paymentId/allocations/:allocationId
  return apiDelete(`${base}/payments/${paymentId}/allocations/${allocationId}`);
}

// تفاصيل دفعه
export async function getArPaymentById(id: string): Promise<ArPaymentDetails> {
  return apiGet(`${base}/payments/${id}`);
}

// ---------- Ledger ----------
export async function getClientLedger(clientId: string): Promise<ArLedgerResponse> {
  return apiGet(`${base}/clients/${clientId}/ledger`);
}