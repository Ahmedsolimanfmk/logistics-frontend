"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { apiAuthGet } from "@/src/lib/api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function getCurrentLocale(): string {
  if (typeof window === "undefined") return "ar-EG";
  const v = localStorage.getItem("app_lang");
  return v === "en" ? "en-US" : "ar-EG";
}

const fmtInt = (n: unknown) =>
  new Intl.NumberFormat(getCurrentLocale(), { maximumFractionDigits: 0 }).format(
    Number(n ?? 0)
  );

const fmtDate = (d: unknown) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString(getCurrentLocale());
};

const shortId = (id: unknown) => {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
};

type AlertRow = {
  id: string;
  type: string;
  severity: "danger" | "warn" | "info";
  area: "operations" | "finance" | "maintenance" | "compliance" | string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  href?: string | null;
  created_at: string;
  meta?: Record<string, any>;
};

type AlertsResponse = {
  total: number;
  items: AlertRow[];
};

type AlertsSummaryResponse = {
  total: number;
  by_severity: {
    danger: number;
    warn: number;
    info: number;
  };
  by_area: {
    operations: number;
    finance: number;
    maintenance: number;
    compliance: number;
  };
};

function areaLabel(area: string, t: any) {
  switch (String(area || "").toLowerCase()) {
    case "operations":
      return t("tabs.operations");
    case "finance":
      return t("tabs.finance");
    case "maintenance":
      return t("tabs.maintenance");
    case "compliance":
      return t("dashboard.compliance.title");
    default:
      return area || "—";
  }
}

function EmptyNice({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{hint}</div>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  tone = "neutral",
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "warn" | "danger" | "good";
}) {
  const toneCls =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50"
      : tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : "border-gray-200 bg-white";

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", toneCls)}>
      <div className="text-xs text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-gray-600">{hint}</div> : null}
    </div>
  );
}

function DataTable({
  title,
  rows,
  columns,
  empty,
  searchable = false,
  right,
  onRowClick,
}: {
  title: string;
  rows: any[];
  columns: {
    key: string;
    label: string;
    render?: (r: any) => React.ReactNode;
    className?: string;
  }[];
  empty?: React.ReactNode | string;
  searchable?: boolean;
  right?: React.ReactNode;
  onRowClick?: (r: any) => void;
}) {
  const t = useT();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!searchable) return rows || [];
    const s = q.trim().toLowerCase();
    if (!s) return rows || [];
    return (rows || []).filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, q, searchable]);

  const emptyNode = typeof empty !== "undefined" ? empty : t("common.noData");
  const clickable = Boolean(onRowClick);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">{title}</div>

        <div className="flex items-center gap-2">
          {right}
          {searchable ? (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.search")}
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
            />
          ) : null}
          <span className="text-xs text-gray-600">
            {fmtInt(filtered.length)} {t("common.rows")}
          </span>
        </div>
      </div>

      {!filtered.length ? (
        <div className="p-5 text-sm text-gray-700">
          {typeof emptyNode === "string" ? emptyNode : emptyNode}
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm" dir="rtl">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "text-right font-medium text-gray-700 px-4 py-2 whitespace-nowrap",
                      c.className
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((r, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "border-t border-gray-200 hover:bg-gray-50",
                    clickable && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (onRowClick) onRowClick(r);
                  }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-2 text-gray-900 whitespace-nowrap text-right",
                        c.className
                      )}
                    >
                      {c.render ? c.render(r) : String(r?.[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const t = useT();
  const router = useRouter();

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [summary, setSummary] = useState<AlertsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<"all" | "danger" | "warn" | "info">("all");
  const [areaFilter, setAreaFilter] = useState<
    "all" | "operations" | "finance" | "maintenance" | "compliance"
  >("all");

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const [alertsRes, summaryRes] = await Promise.all([
        apiAuthGet("/dashboard/alerts", { limit: 200 }),
        apiAuthGet("/dashboard/alerts/summary"),
      ]);

      const alertsData = alertsRes as AlertsResponse;
      const summaryData = summaryRes as AlertsSummaryResponse;

      setRows(Array.isArray(alertsData?.items) ? alertsData.items : []);
      setSummary(summaryData || null);
    } catch (e: any) {
      setRows([]);
      setSummary(null);
      setErr(e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const severityOk = severityFilter === "all" ? true : r.severity === severityFilter;
      const areaOk =
        areaFilter === "all" ? true : String(r.area).toLowerCase() === areaFilter;
      return severityOk && areaOk;
    });
  }, [rows, severityFilter, areaFilter]);

  const kpi = useMemo(() => {
    const s = summary || {
      total: rows.length,
      by_severity: { danger: 0, warn: 0, info: 0 },
      by_area: { operations: 0, finance: 0, maintenance: 0, compliance: 0 },
    };

    return {
      total: Number(s?.total ?? rows.length ?? 0),
      danger: Number(s?.by_severity?.danger ?? 0),
      warn: Number(s?.by_severity?.warn ?? 0),
      info: Number(s?.by_severity?.info ?? 0),
    };
  }, [summary, rows]);

  return (
    <div className="min-h-screen text-gray-900" dir="rtl">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("alertsPage.title")}</div>
            <div className="text-sm text-gray-600">{t("alertsPage.subtitle")}</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm"
            >
              {t("common.back")}
            </Link>

            <button
              type="button"
              onClick={load}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm"
              disabled={loading}
            >
              {loading ? t("common.loading") : t("common.refresh")}
            </button>
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title={t("dashboard.alerts.total")}
            value={fmtInt(kpi.total)}
            hint={t("dashboard.alerts.totalHint")}
            tone={kpi.total > 0 ? "neutral" : "good"}
          />
          <StatCard
            title={t("dashboard.alerts.danger")}
            value={fmtInt(kpi.danger)}
            hint={t("dashboard.alerts.dangerHint")}
            tone={kpi.danger > 0 ? "danger" : "good"}
          />
          <StatCard
            title={t("dashboard.alerts.warn")}
            value={fmtInt(kpi.warn)}
            hint={t("dashboard.alerts.warnHint")}
            tone={kpi.warn > 0 ? "warn" : "good"}
          />
          <StatCard
            title={t("dashboard.alerts.info")}
            value={fmtInt(kpi.info)}
            hint={t("dashboard.alerts.infoHint")}
            tone="neutral"
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("alertsPage.filters.severity")}
              </label>
              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(e.target.value as "all" | "danger" | "warn" | "info")
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">{t("alertsPage.filters.all")}</option>
                <option value="danger">{t("dashboard.alerts.severity.danger")}</option>
                <option value="warn">{t("dashboard.alerts.severity.warn")}</option>
                <option value="info">{t("dashboard.alerts.severity.info")}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("alertsPage.filters.area")}
              </label>
              <select
                value={areaFilter}
                onChange={(e) =>
                  setAreaFilter(
                    e.target.value as
                      | "all"
                      | "operations"
                      | "finance"
                      | "maintenance"
                      | "compliance"
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">{t("alertsPage.filters.all")}</option>
                <option value="operations">{t("tabs.operations")}</option>
                <option value="finance">{t("tabs.finance")}</option>
                <option value="maintenance">{t("tabs.maintenance")}</option>
                <option value="compliance">{t("dashboard.compliance.title")}</option>
              </select>
            </div>
          </div>
        </div>

        <DataTable
          title={t("alertsPage.tableTitle")}
          rows={filteredRows}
          searchable
          right={
            <span className="text-xs text-gray-600">
              {t("alertsPage.filteredCount")} {fmtInt(filteredRows.length)}
            </span>
          }
          empty={
            <EmptyNice
              title={t("dashboard.alerts.emptyTitle")}
              hint={t("dashboard.alerts.emptyHint")}
            />
          }
          onRowClick={(r) => {
            if (r?.href) router.push(r.href);
          }}
          columns={[
            {
              key: "severity",
              label: t("dashboard.alerts.columns.severity"),
              render: (r) => {
                const sev = String(r?.severity || "");
                const cls =
                  sev === "danger"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : sev === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-gray-50 text-gray-700";

                const text =
                  sev === "danger"
                    ? t("dashboard.alerts.severity.danger")
                    : sev === "warn"
                    ? t("dashboard.alerts.severity.warn")
                    : t("dashboard.alerts.severity.info");

                return (
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-xs",
                      cls
                    )}
                  >
                    {text}
                  </span>
                );
              },
            },
            {
              key: "area",
              label: t("dashboard.alerts.columns.area"),
              render: (r) => areaLabel(r?.area, t),
            },
            {
              key: "title",
              label: t("dashboard.alerts.columns.title"),
              render: (r) => (
                <div className="flex flex-col items-end">
                  <span className="font-medium">{r?.title || "—"}</span>
                  <span className="text-xs text-gray-600">{r?.message || "—"}</span>
                </div>
              ),
              className: "min-w-[320px]",
            },
            {
              key: "entity_id",
              label: t("dashboard.alerts.columns.reference"),
              render: (r) => (
                <span className="font-mono">
                  {r?.entity_id ? shortId(r.entity_id) : "—"}
                </span>
              ),
            },
            {
              key: "created_at",
              label: t("dashboard.alerts.columns.createdAt"),
              render: (r) => fmtDate(r?.created_at),
            },
            {
              key: "open",
              label: t("common.open"),
              render: (r) =>
                r?.href ? (
                  <button
                    type="button"
                    className="text-orange-700 underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(r.href);
                    }}
                  >
                    {t("common.open")}
                  </button>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}