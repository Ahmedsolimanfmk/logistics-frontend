import { api, apiAuthGet } from "@/src/lib/api";
import type {
  AlertRow,
  AlertsFilters,
  AlertsResponse,
  AlertsSummary,
} from "@/src/types/alerts.types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function unwrapData<T>(value: unknown): T {
  const record = asRecord(value);
  return ((record.data ?? value) as T);
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ) as Partial<T>;
}

function normalizeAlertsResponse(input: unknown): AlertsResponse {
  const data = unwrapData<Record<string, unknown>>(input);

  return {
    total: toNumber(data.total),
    items: asArray<AlertRow>(data.items),
  };
}

export const alertsService = {
  async list(filters: AlertsFilters = {}): Promise<AlertsResponse> {
    const res = await apiAuthGet(
      "/dashboard/alerts",
      compact({
        limit: filters.limit ?? 200,
        area: filters.area ?? undefined,
        read_status: filters.read_status ?? undefined,
      })
    );

    return normalizeAlertsResponse(res);
  },

  async markRead(alertKey: string): Promise<void> {
    await api.patch("/dashboard/alerts/read", {
      alert_key: alertKey,
    });
  },

  async markAllRead(area?: string | null): Promise<void> {
    await api.patch("/dashboard/alerts/read-all", {
      area: area || null,
    });
  },

  buildSummary(rows: AlertRow[]): AlertsSummary {
    return {
      total: rows.length,
      unread: rows.filter((row) => !row.is_read).length,
      read: rows.filter((row) => !!row.is_read).length,
      danger: rows.filter((row) => row.severity === "danger").length,
      warn: rows.filter((row) => row.severity === "warn").length,
      info: rows.filter((row) => row.severity === "info").length,
    };
  },
};

export default alertsService;