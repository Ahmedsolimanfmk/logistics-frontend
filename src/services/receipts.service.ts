import { api } from "@/src/lib/api";
import type {
  InventoryReceipt,
  CreateReceiptPayload,
  ReceiptsFilters,
  ReceiptsKpi,
  ReceiptsListResult,
} from "@/src/types/receipts.types";

function compact(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")
  );
}

function asArray<T = unknown>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];

  if (
    body &&
    typeof body === "object" &&
    "items" in body &&
    Array.isArray((body as { items?: unknown[] }).items)
  ) {
    return ((body as { items?: T[] }).items ?? []) as T[];
  }

  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    Array.isArray((body as { data?: unknown[] }).data)
  ) {
    return ((body as { data?: T[] }).data ?? []) as T[];
  }

  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as { data?: { items?: unknown[] } }).data &&
    Array.isArray((body as { data?: { items?: unknown[] } }).data?.items)
  ) {
    return (((body as { data?: { items?: T[] } }).data?.items) ?? []) as T[];
  }

  return [];
}

function normalizeSingle<T>(body: unknown): T {
  if (body && typeof body === "object") {
    const record = body as {
      data?: T;
      receipt?: T;
      item?: T;
    };

    return (record.data ?? record.receipt ?? record.item ?? body) as T;
  }

  return body as T;
}

function normalizeListResponse(
  body: unknown,
  page: number,
  pageSize: number
): ReceiptsListResult {
  const items = asArray<InventoryReceipt>(body);

  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as {
      total?: number;
      page?: number;
      page_size?: number;
      data?: {
        total?: number;
        page?: number;
        page_size?: number;
      };
    };

    const total =
      Number(record.total ?? record.data?.total ?? items.length) || items.length;
    const normalizedPage = Number(record.page ?? record.data?.page ?? page) || page;
    const normalizedPageSize =
      Number(record.page_size ?? record.data?.page_size ?? pageSize) || pageSize;

    return {
      items,
      total,
      page: normalizedPage,
      page_size: normalizedPageSize,
    };
  }

  return {
    items,
    total: items.length,
    page,
    page_size: pageSize,
  };
}

function matchesQuery(receipt: InventoryReceipt, q: string): boolean {
  const text = [
    receipt.id,
    receipt.invoice_no,
    receipt.status,
    receipt.vendor?.name,
    receipt.vendor_id,
    receipt.warehouse?.name,
    receipt.warehouse_id,
    String(receipt.total_amount ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes(q.toLowerCase());
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export const receiptsService = {
  async list(filters: ReceiptsFilters = {}): Promise<ReceiptsListResult> {
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.min(Math.max(Number(filters.page_size || 25), 1), 200);

    const rawStatus = String(filters.status || "").trim().toUpperCase();
    const status =
      rawStatus && rawStatus !== "ALL"
        ? rawStatus
        : undefined;

    const res = await api.get("/inventory/receipts", {
      params: compact({
        status,
        warehouse_id: filters.warehouse_id,
      }),
    });

    const raw = res?.data ?? res;
    const normalized = normalizeListResponse(raw, page, pageSize);

    const query = String(filters.q || "").trim().toLowerCase();
    const filtered = query
      ? normalized.items.filter((receipt) => matchesQuery(receipt, query))
      : normalized.items;

    const pagedItems = paginate(filtered, page, pageSize);

    return {
      items: pagedItems,
      total: filtered.length,
      page,
      page_size: pageSize,
    };
  },

  async listAll(
    filters: Omit<ReceiptsFilters, "page" | "page_size"> = {}
  ): Promise<InventoryReceipt[]> {
    const rawStatus = String(filters.status || "").trim().toUpperCase();
    const status =
      rawStatus && rawStatus !== "ALL"
        ? rawStatus
        : undefined;

    const res = await api.get("/inventory/receipts", {
      params: compact({
        status,
        warehouse_id: filters.warehouse_id,
      }),
    });

    const raw = res?.data ?? res;
    const items = asArray<InventoryReceipt>(raw);

    const query = String(filters.q || "").trim().toLowerCase();
    if (!query) return items;

    return items.filter((receipt) => matchesQuery(receipt, query));
  },

  async getById(id: string): Promise<InventoryReceipt> {
    const res = await api.get(`/inventory/receipts/${id}`);
    return normalizeSingle<InventoryReceipt>(res?.data ?? res);
  },

  async create(payload: CreateReceiptPayload): Promise<InventoryReceipt> {
    const res = await api.post("/inventory/receipts", payload);
    return normalizeSingle<InventoryReceipt>(res?.data ?? res);
  },

  async submit(id: string): Promise<void> {
    await api.post(`/inventory/receipts/${id}/submit`, {});
  },

  async post(id: string): Promise<void> {
    await api.post(`/inventory/receipts/${id}/post`, {});
  },
  async cancel(id: string): Promise<void> {
  await api.post(`/inventory/receipts/${id}/cancel`, {});
}

  buildKpi(rows: InventoryReceipt[]): ReceiptsKpi {
    const posted = rows.filter(
      (row) => String(row.status || "").toUpperCase() === "POSTED"
    );
    const submitted = rows.filter(
      (row) => String(row.status || "").toUpperCase() === "SUBMITTED"
    );

    return {
      postedSum: posted.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
      postedCount: posted.length,
      submittedSum: submitted.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
      submittedCount: submitted.length,
    };
  },
};

export default receiptsService;