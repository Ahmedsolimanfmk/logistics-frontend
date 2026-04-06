import { api } from "@/src/lib/api";
import type {
  ArInvoice,
  ArInvoiceDetailsResponse,
  ArInvoiceListResponse,
  CreateArInvoicePayload,
  RejectArInvoicePayload,
} from "@/src/types/ar.types";

type ApiEnvelope<T> = { data?: T };

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    return ((value as ApiEnvelope<T>).data ?? value) as T;
  }
  return value as T;
}

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== "")
  ) as Partial<T>;
}

function normalizeInvoice(raw: unknown): ArInvoice {
  return unwrap(raw as ArInvoice | ApiEnvelope<ArInvoice>);
}

function normalizeListResponse(raw: unknown): ArInvoiceListResponse {
  const body = unwrap(raw as ArInvoiceListResponse | ApiEnvelope<ArInvoiceListResponse>);

  if (Array.isArray(body)) {
    return {
      items: body as ArInvoice[],
      total: body.length,
    };
  }

  const record = (body ?? {}) as Partial<ArInvoiceListResponse>;
  return {
    items: Array.isArray(record.items) ? record.items : [],
    total: Number(record.total ?? 0),
  };
}

function normalizeDetailsResponse(raw: unknown): ArInvoiceDetailsResponse {
  const body = unwrap(raw as ArInvoiceDetailsResponse | ApiEnvelope<ArInvoiceDetailsResponse>);
  const record = (body ?? {}) as Partial<ArInvoiceDetailsResponse>;

  return {
    invoice: (record.invoice ?? null) as ArInvoice,
    totals: {
      allocated_posted: Number(record.totals?.allocated_posted ?? 0),
      remaining: Number(record.totals?.remaining ?? 0),
    },
  };
}

export const arInvoicesService = {
  async list(): Promise<ArInvoiceListResponse> {
    const res = await api.get("/finance/ar/invoices");
    return normalizeListResponse(res);
  },

  async getById(id: string): Promise<ArInvoiceDetailsResponse> {
    const res = await api.get(`/finance/ar/invoices/${id}`);
    return normalizeDetailsResponse(res);
  },

  async create(payload: CreateArInvoicePayload): Promise<ArInvoice> {
    const res = await api.post(
      "/finance/ar/invoices",
      compact({
        client_id: payload.client_id,
        contract_id: payload.contract_id || undefined,
        issue_date: payload.issue_date || undefined,
        due_date: payload.due_date || undefined,
        amount:
          payload.amount !== undefined && payload.amount !== null
            ? Number(payload.amount)
            : undefined,
        vat_amount:
          payload.vat_amount !== undefined && payload.vat_amount !== null
            ? Number(payload.vat_amount)
            : undefined,
        notes: payload.notes?.trim() || undefined,
        trip_lines: Array.isArray(payload.trip_lines)
          ? payload.trip_lines.map((line) => ({
              trip_id: line.trip_id,
              amount: Number(line.amount),
              notes: line.notes?.trim() || undefined,
            }))
          : undefined,
      })
    );

    return normalizeInvoice(res);
  },

  async submit(id: string): Promise<ArInvoice> {
    const res = await api.patch(`/finance/ar/invoices/${id}/submit`, {});
    return normalizeInvoice(res);
  },

  async approve(id: string): Promise<ArInvoice> {
    const res = await api.patch(`/finance/ar/invoices/${id}/approve`, {});
    return normalizeInvoice(res);
  },

  async reject(id: string, payload: RejectArInvoicePayload): Promise<ArInvoice> {
    const res = await api.patch(`/finance/ar/invoices/${id}/reject`, {
      rejection_reason: payload.rejection_reason,
    });
    return normalizeInvoice(res);
  },
};