import { api } from "@/src/lib/api";
import type {
  AllocateArPaymentPayload,
  ArPayment,
  ArPaymentAllocation,
  ArPaymentDetailsResponse,
  ArPaymentListResponse,
  CreateArPaymentPayload,
  RejectArPaymentPayload,
  UpdateArPaymentDraftPayload,
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

function normalizePayment(raw: unknown): ArPayment {
  return unwrap(raw as ArPayment | ApiEnvelope<ArPayment>);
}

function normalizeListResponse(raw: unknown): ArPaymentListResponse {
  const body = unwrap(raw as ArPaymentListResponse | ApiEnvelope<ArPaymentListResponse>);

  if (Array.isArray(body)) {
    return {
      items: body as ArPayment[],
      total: body.length,
    };
  }

  const record = (body ?? {}) as Partial<ArPaymentListResponse>;
  return {
    items: Array.isArray(record.items) ? record.items : [],
    total: Number(record.total ?? 0),
  };
}

function normalizeDetailsResponse(raw: unknown): ArPaymentDetailsResponse {
  const body = unwrap(raw as ArPaymentDetailsResponse | ApiEnvelope<ArPaymentDetailsResponse>);
  const record = (body ?? {}) as Partial<ArPaymentDetailsResponse>;

  return {
    payment: (record.payment ?? null) as ArPayment | null,
    totals: {
      allocated: Number(record.totals?.allocated ?? 0),
      remaining: Number(record.totals?.remaining ?? 0),
    },
    allocations: Array.isArray(record.allocations)
      ? (record.allocations as ArPaymentAllocation[])
      : [],
  };
}

export const arPaymentsService = {
  async list(): Promise<ArPaymentListResponse> {
    const res = await api.get("/finance/ar/payments");
    return normalizeListResponse(res);
  },

  async getById(id: string): Promise<ArPaymentDetailsResponse> {
    const res = await api.get(`/finance/ar/payments/${id}`);
    return normalizeDetailsResponse(res);
  },

  async create(payload: CreateArPaymentPayload): Promise<ArPayment> {
    const res = await api.post(
      "/finance/ar/payments",
      compact({
        client_id: payload.client_id,
        payment_date: payload.payment_date || undefined,
        amount: Number(payload.amount),
        method: payload.method,
        reference: payload.reference ?? undefined,
        notes: payload.notes ?? undefined,
      })
    );

    return normalizePayment(res);
  },

  async updateDraft(id: string, payload: UpdateArPaymentDraftPayload): Promise<ArPayment> {
    const res = await api.patch(
      `/finance/ar/payments/${id}`,
      compact({
        payment_date: payload.payment_date || undefined,
        amount:
          payload.amount !== undefined && payload.amount !== null
            ? Number(payload.amount)
            : undefined,
        method: payload.method || undefined,
        reference: payload.reference,
        notes: payload.notes,
      })
    );

    return normalizePayment(res);
  },

  async deleteDraft(id: string): Promise<void> {
    await api.delete(`/finance/ar/payments/${id}`);
  },

  async submit(id: string): Promise<ArPayment> {
    const res = await api.patch(`/finance/ar/payments/${id}/submit`, {});
    return normalizePayment(res);
  },

  async approve(id: string): Promise<ArPayment> {
    const res = await api.patch(`/finance/ar/payments/${id}/approve`, {});
    return normalizePayment(res);
  },

  async reject(id: string, payload: RejectArPaymentPayload): Promise<ArPayment> {
    const res = await api.patch(`/finance/ar/payments/${id}/reject`, {
      rejection_reason: payload.rejection_reason,
    });
    return normalizePayment(res);
  },

  async allocate(id: string, payload: AllocateArPaymentPayload): Promise<unknown> {
    const res = await api.post(`/finance/ar/payments/${id}/allocate`, {
      invoice_id: payload.invoice_id,
      amount: Number(payload.amount),
    });
    return unwrap(res as unknown);
  },

  async deleteAllocation(paymentId: string, allocationId: string): Promise<void> {
    await api.delete(`/finance/ar/payments/${paymentId}/allocations/${allocationId}`);
  },
};