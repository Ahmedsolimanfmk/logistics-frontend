"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { api, apiAuthGet } from "@/src/lib/api";

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

type AlertSeverity = "danger" | "warn" | "info";
type AlertArea = "operations" | "finance" | "maintenance" | "compliance";
type SeverityFilter = "all" | AlertSeverity;
type AreaFilter = "all" | AlertArea;
type TypeFilter = "all" | string;
type ReadStatusFilter = "all" | "read" | "unread";

type AlertRow = {
  id: string;
  alert_key?: string;
  type: string;
  severity: AlertSeverity;
  area: AlertArea | string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  href?: string | null;
  created_at: string;
  meta?: Record<string, any>;
  is_read?: boolean;
  read_at?: string | null;
};

type AlertsResponse = {
  total: number;
  items: AlertRow[];
};

function isValidSeverity(v: string | null): v is AlertSeverity {
  return v === "danger" || v === "warn" || v === "info";
}

function isValidArea(v: string | null): v is AlertArea {
  return (
    v === "operations" ||
    v === "finance" ||
    v === "maintenance" ||
    v === "compliance"
  );
}

function isValidReadStatus(v: string | null): v is ReadStatusFilter {
  return v === "all" || v === "read" || v === "unread";
}

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

function typeLabel(type: string, t: any) {
  switch (String(type || "").toUpperCase()) {
    case "TRIP_FINANCE_CLOSE_PENDING":
      return t("alertsPage.types.tripFinanceClosePending");
    case "AR_OVERDUE":
      return t("alertsPage.types.arOverdue");
    case "AR_DUE_SOON":
      return t("alertsPage.types.arDueSoon");
    case "EXPENSE_PENDING_TOO_LONG":
      return t("alertsPage.types.expensePendingTooLong");
    case "ADVANCE_OPEN_TOO_LONG":
      return t("alertsPage.types.advanceOpenTooLong");
    case "MAINTENANCE_OPEN_WORK_ORDER":
      return t("alertsPage.types.maintenanceOpenWorkOrder");
    case "MAINTENANCE_QA_NEEDS":
      return t("alertsPage.types.maintenanceQaNeeds");
    case "MAINTENANCE_QA_FAILED":
      return t("alertsPage.types.maintenanceQaFailed");
    case "MAINTENANCE_PARTS_MISMATCH":
      return t("alertsPage.types.maintenancePartsMismatch");
    case "VEHICLE_LICENSE_EXPIRED":
      return t("alertsPage.types.vehicleLicenseExpired");
    case "VEHICLE_LICENSE_EXPIRING":
      return t("alertsPage.types.vehicleLicenseExpiring");
    case "DRIVER_LICENSE_EXPIRED":
      return t("alertsPage.types.driverLicenseExpired");
    case "DRIVER_LICENSE_EXPIRING":
      return t("alertsPage.types.driverLicenseExpiring");
    default:
      return type || "—";
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
                    !r?.is_read && "bg-blue-50/40",
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

function AlertsPageContent() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [readStatusFilter, setReadStatusFilter] = useState<ReadStatusFilter>("all");

  useEffect(() => {
    const severityFromUrl = searchParams.get("severity");
    const areaFromUrl = searchParams.get("area");
    const typeFromUrl = searchParams.get("type");
    const readStatusFromUrl = searchParams.get("read_status");

    setSeverityFilter(isValidSeverity(severityFromUrl) ? severityFromUrl : "all");
    setAreaFilter(isValidArea(areaFromUrl) ? areaFromUrl : "all");
    setTypeFilter(typeFromUrl && typeFromUrl.trim() ? typeFromUrl : "all");
    setReadStatusFilter(
      isValidReadStatus(readStatusFromUrl) ? readStatusFromUrl : "all"
    );
  }, [searchParams]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const params: Record<string, any> = {
        limit: 200,
      };

      if (areaFilter !== "all") params.area = areaFilter;
      if (readStatusFilter !== "all") params.read_status = readStatusFilter;

      const alertsRes = (await apiAuthGet("/dashboard/alerts", params)) as AlertsResponse;
      setRows(Array.isArray(alertsRes?.items) ? alertsRes.items : []);
    } catch (e: any) {
      setRows([]);
      setErr(e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFilter, readStatusFilter]);

  function updateUrl(
    nextSeverity: SeverityFilter,
    nextArea: AreaFilter,
    nextType: TypeFilter,
    nextReadStatus: ReadStatusFilter
  ) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSeverity === "all") params.delete("severity");
    else params.set("severity", nextSeverity);

    if (nextArea === "all") params.delete("area");
    else params.set("area", nextArea);

    if (nextType === "all") params.delete("type");
    else params.set("type", nextType);

    if (nextReadStatus === "all") params.delete("read_status");
    else params.set("read_status", nextReadStatus);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const availableTypes = useMemo(() => {
    const unique = Array.from(
      new Set(
        rows
          .map((r) => String(r.type || "").trim())
          .filter(Boolean)
      )
    );
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const severityOk = severityFilter === "all" ? true : r.severity === severityFilter;
      const areaOk =
        areaFilter === "all" ? true : String(r.area).toLowerCase() === areaFilter;
      const typeOk = typeFilter === "all" ? true : String(r.type) === typeFilter;
      const readOk =
        readStatusFilter === "all"
          ? true
          : readStatusFilter === "read"
          ? Boolean(r.is_read)
          : !Boolean(r.is_read);

      return severityOk && areaOk && typeOk && readOk;
    });
  }, [rows, severityFilter, areaFilter, typeFilter, readStatusFilter]);

  const filteredSummary = useMemo(() => {
    return {
      total: filteredRows.length,
      unread: filteredRows.filter((r) => !r.is_read).length,
      read: filteredRows.filter((r) => !!r.is_read).length,
      danger: filteredRows.filter((r) => r.severity === "danger").length,
      warn: filteredRows.filter((r) => r.severity === "warn").length,
      info: filteredRows.filter((r) => r.severity === "info").length,
    };
  }, [filteredRows]);

  const isFiltered =
    severityFilter !== "all" ||
    areaFilter !== "all" ||
    typeFilter !== "all" ||
    readStatusFilter !== "all";

  async function handleMarkRead(row: AlertRow) {
    const alertKey = String(row?.alert_key || row?.id || "").trim();
    if (!alertKey || row?.is_read) return;

    try {
      await api.patch("/dashboard/alerts/read", {
        alert_key: alertKey,
      });

      setRows((prev) =>
        prev.map((item) =>
          String(item.alert_key || item.id) === alertKey
            ? {
                ...item,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : item
        )
      );
    } catch (e) {
      // no-op
    }
  }

  async function handleOpen(row: AlertRow) {
    await handleMarkRead(row);
    if (row?.href) router.push(row.href);
  }

  async function handleMarkAllRead() {
    try {
      setMarkingAll(true);
      setErr(null);

      await api.patch("/dashboard/alerts/read-all", {
        area: areaFilter === "all" ? null : areaFilter,
      });

      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setMarkingAll(false);
    }
  }

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
              onClick={handleMarkAllRead}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
              disabled={loading || markingAll || filteredSummary.unread === 0}
            >
              {markingAll
                ? t("common.loading")
                : t("alertsPage.markAllRead")}
            </button>

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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard
            title={t("dashboard.alerts.total")}
            value={fmtInt(filteredSummary.total)}
            hint={t("dashboard.alerts.totalHint")}
            tone={filteredSummary.total > 0 ? "neutral" : "good"}
          />
          <StatCard
            title={t("alertsPage.unread")}
            value={fmtInt(filteredSummary.unread)}
            hint={t("alertsPage.unreadHint")}
            tone={filteredSummary.unread > 0 ? "warn" : "good"}
          />
          <StatCard
            title={t("dashboard.alerts.danger")}
            value={fmtInt(filteredSummary.danger)}
            hint={t("dashboard.alerts.dangerHint")}
            tone={filteredSummary.danger > 0 ? "danger" : "good"}
          />
          <StatCard
            title={t("dashboard.alerts.warn")}
            value={fmtInt(filteredSummary.warn)}
            hint={t("dashboard.alerts.warnHint")}
            tone={filteredSummary.warn > 0 ? "warn" : "good"}
          />
          <StatCard
            title={t("dashboard.alerts.info")}
            value={fmtInt(filteredSummary.info)}
            hint={t("dashboard.alerts.infoHint")}
            tone="neutral"
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("alertsPage.filters.readStatus")}
              </label>
              <select
                value={readStatusFilter}
                onChange={(e) => {
                  const nextReadStatus = e.target.value as ReadStatusFilter;
                  setReadStatusFilter(nextReadStatus);
                  updateUrl(severityFilter, areaFilter, typeFilter, nextReadStatus);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">{t("alertsPage.filters.all")}</option>
                <option value="unread">{t("alertsPage.unread")}</option>
                <option value="read">{t("alertsPage.read")}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("alertsPage.filters.severity")}
              </label>
              <select
                value={severityFilter}
                onChange={(e) => {
                  const nextSeverity = e.target.value as SeverityFilter;
                  setSeverityFilter(nextSeverity);
                  updateUrl(nextSeverity, areaFilter, typeFilter, readStatusFilter);
                }}
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
                onChange={(e) => {
                  const nextArea = e.target.value as AreaFilter;
                  setAreaFilter(nextArea);
                  updateUrl(severityFilter, nextArea, typeFilter, readStatusFilter);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">{t("alertsPage.filters.all")}</option>
                <option value="operations">{t("tabs.operations")}</option>
                <option value="finance">{t("tabs.finance")}</option>
                <option value="maintenance">{t("tabs.maintenance")}</option>
                <option value="compliance">{t("dashboard.compliance.title")}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("alertsPage.filters.type")}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  const nextType = e.target.value as TypeFilter;
                  setTypeFilter(nextType);
                  updateUrl(severityFilter, areaFilter, nextType, readStatusFilter);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">{t("alertsPage.filters.all")}</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type, t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isFiltered ? (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setSeverityFilter("all");
                  setAreaFilter("all");
                  setTypeFilter("all");
                  setReadStatusFilter("all");
                  updateUrl("all", "all", "all", "all");
                }}
                className="text-sm text-orange-700 underline"
              >
                {t("alertsPage.clearFilters")}
              </button>
            </div>
          ) : null}
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
            handleOpen(r);
          }}
          columns={[
            {
              key: "status",
              label: t("alertsPage.status"),
              render: (r) => (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                    r?.is_read
                      ? "border-gray-200 bg-gray-50 text-gray-700"
                      : "border-blue-200 bg-blue-50 text-blue-700 font-medium"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      r?.is_read ? "bg-gray-400" : "bg-blue-600"
                    )}
                  />
                  {r?.is_read ? t("alertsPage.read") : t("alertsPage.unread")}
                </span>
              ),
            },
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
              key: "type",
              label: t("alertsPage.filters.type"),
              render: (r) => typeLabel(r?.type, t),
            },
            {
              key: "title",
              label: t("dashboard.alerts.columns.title"),
              render: (r) => (
                <div className="flex flex-col items-end">
                  <span className={cn("font-medium", !r?.is_read && "font-semibold")}>
                    {r?.title || "—"}
                  </span>
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
                      handleOpen(r);
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

function AlertsPageFallback() {
  return (
    <div className="min-h-screen text-gray-900" dir="rtl">
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          جاري تحميل التنبيهات...
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<AlertsPageFallback />}>
      <AlertsPageContent />
    </Suspense>
  );
}