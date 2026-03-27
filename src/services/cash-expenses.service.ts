import { api } from "@/src/lib/api";
import type {
  AppealCashExpensePayload,
  ApproveCashExpensePayload,
  CashExpense,
  CashExpenseAuditResponse,
  CashExpenseListParams,
  CashExpenseListResponse,
  CashExpenseListStatusFilter,
  CashExpensePaymentSource,
  CashExpenseSummaryResponse,
  CreateCashExpensePayload,
  RejectCashExpensePayload,
  ReopenCashExpensePayload,
  ResolveAppealPayload,
} from "@/src/types/cash-expenses.types";

type ApiEnvelope<T> = { data?: T };

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    return ((value as ApiEnvelope<T>).data ?? value) as T;
  }
  return value as T;
}

function normalizeStatus(status?: CashExpenseListStatusFilter): string | undefined {
  if (!status || status === "ALL") return undefined;
  return String(status).toUpperCase();
}

function normalizePaymentSource(
  paymentSource?: CashExpensePaymentSource
): CashExpensePaymentSource | undefined {
  if (!paymentSource) return undefined;
  return String(paymentSource).toUpperCase() as CashExpensePaymentSource;
}

function normalizeListResponse(raw: unknown): CashExpenseListResponse {
  const body = unwrap(raw as CashExpenseListResponse | ApiEnvelope<CashExpenseListResponse>);

  if (Array.isArray(body)) {
    return {
      items: body as CashExpense[],
      total: body.length,
      page: 1,
      page_size: body.length,
    };
  }

  const record = (body ?? {}) as Partial<CashExpenseListResponse>;

  return {
    items: Array.isArray(record.items) ? record.items : [],
    total: Number(record.total ?? 0),
    page: Number(record.page ?? 1),
    page_size: Number(record.page_size ?? (Array.isArray(record.items) ? record.items.length : 0)),
  };
}

function normalizeSummaryResponse(raw: unknown): CashExpenseSummaryResponse {
  const body = unwrap(raw as CashExpenseSummaryResponse | ApiEnvelope<CashExpenseSummaryResponse>);
  const totals = (body as CashExpenseSummaryResponse | undefined)?.totals;

  return {
    totals: {
      sumAll: Number(totals?.sumAll ?? 0),
      countAll: Number(totals?.countAll ?? 0),
      sumApproved: Number(totals?.sumApproved ?? 0),
      countApproved: Number(totals?.countApproved ?? 0),
      sumPending: Number(totals?.sumPending ?? 0),
      countPending: Number(totals?.countPending ?? 0),
      sumRejected: Number(totals?.sumRejected ?? 0),
      countRejected: Number(totals?.countRejected ?? 0),
      sumAppealed: Number(totals?.sumAppealed ?? 0),
      countAppealed: Number(totals?.countAppealed ?? 0),
      sumResolved: Number(totals?.sumResolved ?? 0),
      countResolved: Number(totals?.countResolved ?? 0),
    },
  };
}

function normalizeAuditResponse(raw: unknown): CashExpenseAuditResponse {
  const body = unwrap(raw as CashExpenseAuditResponse | ApiEnvelope<CashExpenseAuditResponse>);
  const record = (body ?? {}) as Partial<CashExpenseAuditResponse>;

  return {
    items: Array.isArray(record.items) ? record.items : [],
    note: record.note ?? null,
  };
}

function normalizeExpense(raw: unknown): CashExpense {
  return unwrap(raw as CashExpense | ApiEnvelope<CashExpense>);
}

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== "")
  ) as Partial<T>;
}

export const cashExpensesService = {
  async list(params: CashExpenseListParams = {}): Promise<CashExpenseListResponse> {
    const res = await api.get("/cash/cash-expenses", {
      params: compact({
        status: normalizeStatus(params.status),
        payment_source: normalizePaymentSource(params.payment_source),
        q: params.q?.trim() || undefined,
        vendor_id: params.vendor_id || undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? 25,
      }),
    });

    return normalizeListResponse(res);
  },

  async getSummary(params: Omit<CashExpenseListParams, "page" | "page_size"> = {}): Promise<CashExpenseSummaryResponse> {
    const res = await api.get("/cash/cash-expenses/summary", {
      params: compact({
        status: normalizeStatus(params.status),
        payment_source: normalizePaymentSource(params.payment_source),
        q: params.q?.trim() || undefined,
        vendor_id: params.vendor_id || undefined,
      }),
    });

    return normalizeSummaryResponse(res);
  },

  async getById(id: string): Promise<CashExpense> {
    const res = await api.get(`/cash/cash-expenses/${id}`);
    return normalizeExpense(res);
  },

  async getAudit(id: string): Promise<CashExpenseAuditResponse> {
    const res = await api.get(`/cash/cash-expenses/${id}/audit`);
    return normalizeAuditResponse(res);
  },

  async create(payload: CreateCashExpensePayload): Promise<CashExpense> {
    const body =
      payload.payment_source === "ADVANCE"
        ? compact({
            payment_source: "ADVANCE",
            expense_type: payload.expense_type,
            amount: Number(payload.amount),
            notes: payload.notes?.trim() || undefined,
            cash_advance_id: payload.cash_advance_id,
            maintenance_work_order_id: payload.maintenance_work_order_id || undefined,
            trip_id: payload.trip_id || undefined,
            vehicle_id: payload.vehicle_id || undefined,
            vendor_id: payload.vendor_id || undefined,
          })
        : compact({
            payment_source: "COMPANY",
            expense_type: payload.expense_type,
            amount: Number(payload.amount),
            notes: payload.notes?.trim() || undefined,
            vendor_id: payload.vendor_id || undefined,
            vendor_name: payload.vendor_name?.trim() || undefined,
            invoice_no: payload.invoice_no?.trim() || undefined,
            invoice_date: payload.invoice_date || undefined,
            maintenance_work_order_id: payload.maintenance_work_order_id || undefined,
            trip_id: payload.trip_id || undefined,
            vehicle_id: payload.vehicle_id || undefined,
          });

    const res = await api.post("/cash/cash-expenses", body);
    return normalizeExpense(res);
  },

  async approve(id: string, payload: ApproveCashExpensePayload = {}): Promise<void> {
    await api.post(`/cash/cash-expenses/${id}/approve`, {
      notes: payload.notes ?? null,
    });
  },

  async reject(id: string, payload: RejectCashExpensePayload): Promise<void> {
    await api.post(`/cash/cash-expenses/${id}/reject`, {
      reason: payload.reason,
      notes: payload.notes ?? null,
    });
  },

  async appeal(id: string, payload: AppealCashExpensePayload): Promise<void> {
    await api.post(`/cash/cash-expenses/${id}/appeal`, {
      notes: payload.notes,
    });
  },

  async resolveAppeal(id: string, payload: ResolveAppealPayload): Promise<void> {
    await api.post(`/cash/cash-expenses/${id}/resolve-appeal`, compact({
      decision: payload.decision,
      notes: payload.notes ?? undefined,
      reason: payload.reason ?? undefined,
    }));
  },

  async reopen(id: string, payload: ReopenCashExpensePayload = {}): Promise<void> {
    await api.post(`/cash/cash-expenses/${id}/reopen`, {
      notes: payload.notes ?? null,
    });
  },
};