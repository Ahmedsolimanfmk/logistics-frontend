import { api } from "@/src/lib/api";
import type {
  CashAdvance,
  CashAdvanceListParams,
  CashAdvanceListResponse,
  CashAdvanceStatus,
  CashAdvanceSummaryResponse,
  CloseCashAdvancePayload,
  CreateCashAdvancePayload,
  ReopenCashAdvancePayload,
} from "@/src/types/cash-advances.types";
import type { CashExpense } from "@/src/types/cash-expenses.types";

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

function normalizeStatus(status?: CashAdvanceStatus): string | undefined {
  if (!status || status === "ALL") return undefined;
  return String(status).toUpperCase();
}

function normalizeListResponse(raw: unknown): CashAdvanceListResponse {
  const body = unwrap(raw as CashAdvanceListResponse | ApiEnvelope<CashAdvanceListResponse>);

  if (Array.isArray(body)) {
    return {
      items: body as CashAdvance[],
      total: body.length,
      page: 1,
      page_size: body.length,
    };
  }

  const record = (body ?? {}) as Partial<CashAdvanceListResponse>;

  return {
    items: Array.isArray(record.items) ? record.items : [],
    total: Number(record.total ?? 0),
    page: Number(record.page ?? 1),
    page_size: Number(record.page_size ?? (Array.isArray(record.items) ? record.items.length : 0)),
  };
}

function normalizeSummaryResponse(raw: unknown): CashAdvanceSummaryResponse {
  const body = unwrap(raw as CashAdvanceSummaryResponse | ApiEnvelope<CashAdvanceSummaryResponse>);
  const totals = (body as CashAdvanceSummaryResponse | undefined)?.totals;

  return {
    totals: {
      sumAmount: Number(totals?.sumAmount ?? 0),
      countAll: Number(totals?.countAll ?? 0),
      openCount: Number(totals?.openCount ?? 0),
      settledCount: Number(totals?.settledCount ?? 0),
      canceledCount: Number(totals?.canceledCount ?? 0),
    },
  };
}

function normalizeAdvance(raw: unknown): CashAdvance {
  return unwrap(raw as CashAdvance | ApiEnvelope<CashAdvance>);
}

function normalizeExpenseArray(raw: unknown): CashExpense[] {
  const body = unwrap(raw as CashExpense[] | ApiEnvelope<CashExpense[]>);
  return Array.isArray(body) ? body : [];
}

export const cashAdvancesService = {
  async list(params: CashAdvanceListParams = {}): Promise<CashAdvanceListResponse> {
    const res = await api.get("/cash/cash-advances", {
      params: compact({
        status: normalizeStatus(params.status),
        q: params.q?.trim() || undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? 25,
      }),
    });

    return normalizeListResponse(res);
  },

  async getSummary(
    params: Omit<CashAdvanceListParams, "page" | "page_size"> = {}
  ): Promise<CashAdvanceSummaryResponse> {
    const res = await api.get("/cash/cash-advances/summary", {
      params: compact({
        status: normalizeStatus(params.status),
        q: params.q?.trim() || undefined,
      }),
    });

    return normalizeSummaryResponse(res);
  },

  async getById(id: string): Promise<CashAdvance> {
    const res = await api.get(`/cash/cash-advances/${id}`);
    return normalizeAdvance(res);
  },

  async getExpenses(id: string, status?: string): Promise<CashExpense[]> {
    const res = await api.get(`/cash/cash-advances/${id}/expenses`, {
      params: compact({
        status: status ? String(status).toUpperCase() : undefined,
      }),
    });

    return normalizeExpenseArray(res);
  },

  async create(payload: CreateCashAdvancePayload): Promise<CashAdvance> {
    const res = await api.post("/cash/cash-advances", {
      field_supervisor_id: payload.field_supervisor_id,
      amount: Number(payload.amount),
    });

    return normalizeAdvance(res);
  },

  async submitReview(id: string): Promise<void> {
    await api.post(`/cash/cash-advances/${id}/submit-review`, {});
  },

  async close(id: string, payload: CloseCashAdvancePayload): Promise<void> {
    await api.post(`/cash/cash-advances/${id}/close`, {
      settlement_type: payload.settlement_type,
      amount: Number(payload.amount),
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
    });
  },

  async reopen(id: string, payload: ReopenCashAdvancePayload = {}): Promise<void> {
    await api.post(`/cash/cash-advances/${id}/reopen`, {
      notes: payload.notes ?? null,
    });
  },
};