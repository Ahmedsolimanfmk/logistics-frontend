import { api, apiAuthGet } from "@/src/lib/api";
import type {
  DashboardAlertRow,
  DashboardAlertsListResponse,
  DashboardAlertsSummary,
  DashboardComplianceResponse,
  DashboardSummaryResponse,
  DashboardTabKey,
  DashboardTrendPoint,
  DashboardTrendsBundle,
} from "@/src/types/dashboard.types";

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

function normalizeTrendSeries(input: unknown): DashboardTrendPoint[] {
  return asArray<Record<string, unknown>>(input).map((item) => ({
    label: String(item.label ?? item.bucket ?? ""),
    value: toNumber(item.value),
  }));
}

function normalizeSummary(input: unknown): DashboardSummaryResponse {
  const data = unwrapData<Record<string, unknown>>(input);
  return {
    cards: asRecord(data.cards) as DashboardSummaryResponse["cards"],
    tables: asRecord(data.tables) as DashboardSummaryResponse["tables"],
    alerts: asRecord(data.alerts) as DashboardSummaryResponse["alerts"],
  };
}

function normalizeTrendsBundle(input: unknown): DashboardTrendsBundle {
  const data = unwrapData<Record<string, unknown>>(input);

  return {
    trips_created: normalizeTrendSeries(data.trips_created),
    trips_assigned: normalizeTrendSeries(data.trips_assigned),
    expenses_approved: normalizeTrendSeries(data.expenses_approved),
    expenses_pending: normalizeTrendSeries(data.expenses_pending),
  };
}

function normalizeCompliance(input: unknown): DashboardComplianceResponse {
  const data = unwrapData<Record<string, unknown>>(input);

  return {
    counts: asRecord(data.counts) as DashboardComplianceResponse["counts"],
    items: asRecord(data.items) as DashboardComplianceResponse["items"],
    range: asRecord(data.range) as DashboardComplianceResponse["range"],
  };
}

function normalizeAlertsList(input: unknown): DashboardAlertsListResponse {
  const data = unwrapData<Record<string, unknown>>(input);

  return {
    total: toNumber(data.total),
    items: asArray<DashboardAlertRow>(data.items),
  };
}

function normalizeAlertsSummary(input: unknown): DashboardAlertsSummary {
  const data = unwrapData<Record<string, unknown>>(input);

  return {
    total: toNumber(data.total),
    unread: toNumber(data.unread),
    read: toNumber(data.read),
    by_severity: asRecord(data.by_severity) as DashboardAlertsSummary["by_severity"],
    by_area: asRecord(data.by_area) as DashboardAlertsSummary["by_area"],
  };
}

export const dashboardService = {
  async getSummary(tab: DashboardTabKey): Promise<DashboardSummaryResponse> {
    const res = await apiAuthGet("/dashboard/summary", { tab });
    return normalizeSummary(res);
  },

  async getTrendsBundle(bucket: "daily" | "weekly" | "monthly" = "daily"): Promise<DashboardTrendsBundle> {
    const res = await apiAuthGet("/dashboard/trends/bundle", { bucket });
    return normalizeTrendsBundle(res);
  },

  async getComplianceAlerts(days = 30, limit = 100): Promise<DashboardComplianceResponse> {
    const res = await apiAuthGet("/dashboard/compliance-alerts", { days, limit });
    return normalizeCompliance(res);
  },

  async getAlerts(limit = 10): Promise<DashboardAlertsListResponse> {
    const res = await apiAuthGet("/dashboard/alerts", { limit });
    return normalizeAlertsList(res);
  },

  async getAlertsSummary(): Promise<DashboardAlertsSummary> {
    const res = await apiAuthGet("/dashboard/alerts/summary");
    return normalizeAlertsSummary(res);
  },

  async markAlertRead(alertKey: string): Promise<void> {
    await api.patch("/dashboard/alerts/read", {
      alert_key: alertKey,
    });
  },

  async markAllAlertsRead(area?: string | null): Promise<void> {
    await api.patch("/dashboard/alerts/read-all", {
      area: area || null,
    });
  },
};

export default dashboardService;