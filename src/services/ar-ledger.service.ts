import { api } from "@/src/lib/api";
import type { ArClientLedgerResponse } from "@/src/types/ar.types";

type ApiEnvelope<T> = { data?: T };

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    return ((value as ApiEnvelope<T>).data ?? value) as T;
  }
  return value as T;
}

function normalizeLedgerResponse(raw: unknown): ArClientLedgerResponse {
  const body = unwrap(raw as ArClientLedgerResponse | ApiEnvelope<ArClientLedgerResponse>);
  const record = (body ?? {}) as Partial<ArClientLedgerResponse>;

  return {
    client: (record.client ?? null) as ArClientLedgerResponse["client"],
    summary: {
      total_invoiced: Number(record.summary?.total_invoiced ?? 0),
      total_paid: Number(record.summary?.total_paid ?? 0),
      balance: Number(record.summary?.balance ?? 0),
    },
    invoices: Array.isArray(record.invoices) ? record.invoices : [],
  };
}

export const arLedgerService = {
  async getClientLedger(clientId: string): Promise<ArClientLedgerResponse> {
    const res = await api.get(`/finance/ar/clients/${clientId}/ledger`);
    return normalizeLedgerResponse(res);
  },
};