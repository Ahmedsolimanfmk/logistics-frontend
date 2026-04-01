"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { TabsBar } from "@/src/components/ui/TabsBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { DashboardAssistantPanel } from "@/src/components/dashboard/DashboardAssistantPanel";
import { DashboardInsightsPanel } from "@/src/components/dashboard/DashboardInsightsPanel";

import dashboardService from "@/src/services/dashboard.service";
import type {
  DashboardAlertRow,
  DashboardComplianceDriverItem,
  DashboardComplianceVehicleItem,
  DashboardSummaryResponse,
  DashboardTabKey,
  DashboardTrendsBundle,
  DashboardComplianceResponse,
  DashboardAlertsSummary,
} from "@/src/types/dashboard.types";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getCurrentLocale(): string {
  if (typeof document !== "undefined") {
    return document.documentElement.lang || "ar-EG";
  }
  return "ar-EG";
}

function fmtInt(value: unknown): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(getCurrentLocale(), {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function fmtMoney(value: unknown): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(getCurrentLocale(), {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(getCurrentLocale());
}

function shortId(value: unknown): string {
  const s = String(value ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function tr(
  t: (key: string, vars?: Record<string, unknown>) => string,
  key: string,
  fallback: string,
  vars?: Record<string, unknown>
) {
  const value = t(key, vars);
  return value === key ? fallback : value;
}

function SeverityBadge({
  severity,
  t,
}: {
  severity?: string | null;
  t: (key: string, vars?: Record<string, unknown>) => string;
}) {
  const s = String(severity || "").toLowerCase();

  const cls =
    s === "danger"
      ? "bg-red-500/10 text-red-700 border-red-500/20"
      : s === "warn"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
      : "bg-sky-500/10 text-sky-700 border-sky-500/20";

  const label =
    s === "danger"
      ? tr(t, "alerts.severity.danger", "حرج")
      : s === "warn"
      ? tr(t, "alerts.severity.warn", "تحذير")
      : tr(t, "alerts.severity.info", "معلومة");

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs", cls)}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <div className="space-y-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xl font-semibold text-[rgb(var(--trex-fg))]">{value}</div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </div>
    </Card>
  );
}

type GenericRow = Record<string, unknown>;

export default function DashboardPage() {
  const t = useT();

  const [tab, setTab] = useState<DashboardTabKey>("operations");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [trendsBundle, setTrendsBundle] = useState<DashboardTrendsBundle | null>(null);
  const [compliance, setCompliance] = useState<DashboardComplianceResponse | null>(null);
  const [alertsList, setAlertsList] = useState<DashboardAlertRow[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<DashboardAlertsSummary | null>(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  function showToast(type: "success" | "error", message: string) {
    setToast({ open: true, message, type });
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [summaryRes, trendsRes, complianceRes, alertsRes, alertsSummaryRes] =
        await Promise.all([
          dashboardService.getSummary(tab),
          dashboardService.getTrendsBundle("daily"),
          dashboardService.getComplianceAlerts(30, 20),
          dashboardService.getAlerts(10),
          dashboardService.getAlertsSummary(),
        ]);

      setSummary(summaryRes);
      setTrendsBundle(trendsRes);
      setCompliance(complianceRes);
      setAlertsList(Array.isArray(alertsRes.items) ? alertsRes.items : []);
      setAlertsSummary(alertsSummaryRes);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message || tr(t, "common.failed", "فشل"))
          : tr(t, "common.failed", "فشل");

      setErr(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const tabs = useMemo(
    () => [
      { key: "operations" as const, label: tr(t, "tabs.operations", "التشغيل") },
      { key: "finance" as const, label: tr(t, "tabs.finance", "المالية") },
      { key: "maintenance" as const, label: tr(t, "tabs.maintenance", "الصيانة") },
      { key: "dev" as const, label: tr(t, "tabs.dev", "المطور") },
    ],
    [t]
  );

  const assistantContext = useMemo<
    "finance" | "ar" | "maintenance" | "inventory" | "trips"
  >(() => {
    if (tab === "operations") return "trips";
    if (tab === "finance") return "finance";
    if (tab === "maintenance") return "maintenance";
    return "finance";
  }, [tab]);

  const activeTripsRows = useMemo(
    () => (summary?.tables?.active_trips_now as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const financeCloseRows = useMemo(
    () => (summary?.tables?.trips_needing_finance_close as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const pendingExpensesRows = useMemo(
    () => (summary?.tables?.pending_expenses_top10 as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const openAdvancesRows = useMemo(
    () => (summary?.tables?.advances_open_top10 as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const overdueInvoicesRows = useMemo(
    () => (summary?.tables?.top_ar_overdue_invoices as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const dueSoonInvoicesRows = useMemo(
    () => (summary?.tables?.top_ar_due_soon_invoices as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const maintenanceRows = useMemo(
    () => (summary?.tables?.maintenance_recent_work_orders as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const vehicleExpiringRows = useMemo(
    () => compliance?.items?.vehicles_expiring ?? [],
    [compliance]
  );

  const driverExpiringRows = useMemo(
    () => compliance?.items?.drivers_expiring ?? [],
    [compliance]
  );

  const recentAlertsColumns: DataTableColumn<DashboardAlertRow>[] = [
    {
      key: "severity",
      label: tr(t, "alerts.columns.severity", "الأولوية"),
      render: (row) => <SeverityBadge severity={row.severity} t={t} />,
    },
    {
      key: "title",
      label: tr(t, "alerts.columns.title", "العنوان"),
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium">{row.title}</div>
          <div className="text-xs text-slate-500">{row.message}</div>
        </div>
      ),
    },
    {
      key: "area",
      label: tr(t, "alerts.columns.area", "القسم"),
      render: (row) => row.area || "—",
    },
    {
      key: "created_at",
      label: tr(t, "dashboard.columns.created", "التاريخ"),
      render: (row) => fmtDate(row.created_at),
    },
    {
      key: "open",
      label: "",
      className: "text-left",
      headerClassName: "text-left",
      render: (row) =>
        row.href ? (
          <Link href={row.href}>
            <Button variant="secondary">{tr(t, "common.open", "فتح")}</Button>
          </Link>
        ) : row.entity_id ? (
          <span className="font-mono text-xs text-slate-500">{shortId(row.entity_id)}</span>
        ) : (
          "—"
        ),
    },
  ];

  const activeTripsColumns: DataTableColumn<GenericRow>[] = [
    {
      key: "trip_id",
      label: tr(t, "dashboard.columns.trip", "الرحلة"),
      render: (row) => shortId(row.trip_id),
    },
    {
      key: "client",
      label: tr(t, "dashboard.columns.client", "العميل"),
      render: (row) => String(row.client ?? row.client_name ?? "—"),
    },
    {
      key: "site",
      label: tr(t, "dashboard.columns.site", "الموقع"),
      render: (row) => String(row.site ?? row.site_name ?? "—"),
    },
    {
      key: "vehicle",
      label: tr(t, "dashboard.columns.vehicle", "المركبة"),
      render: (row) =>
        String(
          row.vehicle_plate_number ??
            row.fleet_no ??
            row.plate_no ??
            row.vehicle_id ??
            "—"
        ),
    },
    {
      key: "driver",
      label: tr(t, "dashboard.columns.driver", "السائق"),
      render: (row) => String(row.driver_name ?? row.driver_id ?? "—"),
    },
  ];

  const financeCloseColumns: DataTableColumn<GenericRow>[] = [
    {
      key: "id",
      label: tr(t, "dashboard.columns.trip", "الرحلة"),
      render: (row) => shortId(row.id),
    },
    {
      key: "client",
      label: tr(t, "dashboard.columns.client", "العميل"),
      render: (row) => String(row.client ?? row.client_name ?? "—"),
    },
    {
      key: "site",
      label: tr(t, "dashboard.columns.site", "الموقع"),
      render: (row) => String(row.site ?? row.site_name ?? "—"),
    },
    {
      key: "status",
      label: tr(t, "dashboard.columns.financial", "المالية"),
      render: (row) => String(row.financial_status ?? row.status ?? "—"),
    },
  ];

  const pendingExpensesColumns: DataTableColumn<GenericRow>[] = [
    {
      key: "amount",
      label: tr(t, "dashboard.columns.amount", "المبلغ"),
      render: (row) => fmtMoney(row.amount),
    },
    {
      key: "expense_type",
      label: tr(t, "dashboard.columns.type", "النوع"),
      render: (row) => String(row.expense_type ?? "—"),
    },
    {
      key: "client",
      label: tr(t, "dashboard.columns.client", "العميل"),
      render: (row) => String(row.client ?? "—"),
    },
    {
      key: "site",
      label: tr(t, "dashboard.columns.site", "الموقع"),
      render: (row) => String(row.site ?? "—"),
    },
    {
      key: "created_at",
      label: tr(t, "dashboard.columns.created", "تاريخ الإنشاء"),
      render: (row) => fmtDate(row.created_at as string | null | undefined),
    },
  ];

  const advancesColumns: DataTableColumn<GenericRow>[] = [
    {
      key: "id",
      label: tr(t, "financeAdvances.table.id", "المعرّف"),
      render: (row) => shortId(row.id),
    },
    {
      key: "advance_amount",
      label: tr(t, "dashboard.columns.amount", "المبلغ"),
      render: (row) => fmtMoney(row.advance_amount),
    },
    {
      key: "remaining",
      label: tr(t, "financeAdvanceDetails.kpis.remaining", "المتبقي"),
      render: (row) => fmtMoney(row.remaining),
    },
    {
      key: "created_at",
      label: tr(t, "dashboard.columns.created", "التاريخ"),
      render: (row) => fmtDate(row.created_at as string | null | undefined),
    },
  ];

  const invoiceColumns: DataTableColumn<GenericRow>[] = [
    {
      key: "invoice_no",
      label: tr(t, "dashboard.columns.invoice", "الفاتورة"),
      render: (row) => String(row.invoice_no ?? "—"),
    },
    {
      key: "client_name",
      label: tr(t, "dashboard.columns.client", "العميل"),
      render: (row) => String(row.client_name ?? "—"),
    },
    {
      key: "outstanding_amount",
      label: tr(t, "dashboard.columns.outstanding", "الرصيد المستحق"),
      render: (row) => fmtMoney(row.outstanding_amount),
    },
    {
      key: "due_date",
      label: tr(t, "dashboard.columns.dueDate", "تاريخ الاستحقاق"),
      render: (row) => fmtDate(row.due_date as string | null | undefined),
    },
    {
      key: "days_metric",
      label:
        tab === "finance"
          ? tr(t, "dashboard.columns.daysOverdue", "أيام التأخير")
          : tr(t, "dashboard.columns.daysToDue", "الأيام المتبقية"),
      render: (row) => fmtInt(row.days_overdue ?? row.days_to_due),
    },
  ];

  const maintenanceColumns: DataTableColumn<GenericRow>[] = [
    {
      key: "id",
      label: tr(t, "dashboard.columns.wo", "أمر عمل"),
      render: (row) => shortId(row.id),
    },
    {
      key: "type",
      label: tr(t, "dashboard.columns.type", "النوع"),
      render: (row) => String(row.type ?? "—"),
    },
    {
      key: "status",
      label: tr(t, "dashboard.columns.status", "الحالة"),
      render: (row) => String(row.status ?? "—"),
    },
    {
      key: "opened_at",
      label: tr(t, "dashboard.columns.opened", "تاريخ الفتح"),
      render: (row) => fmtDate(row.opened_at as string | null | undefined),
    },
    {
      key: "completed_at",
      label: tr(t, "dashboard.columns.completed", "تاريخ الإنهاء"),
      render: (row) => fmtDate(row.completed_at as string | null | undefined),
    },
  ];

  const vehiclesColumns: DataTableColumn<DashboardComplianceVehicleItem>[] = [
    {
      key: "display_name",
      label: tr(t, "dashboard.compliance.licenseNo", "المركبة"),
      render: (row) => row.display_name || row.fleet_no || row.plate_no || "—",
    },
    {
      key: "license_no",
      label: tr(t, "dashboard.compliance.licenseNo", "رقم الرخصة"),
      render: (row) => row.license_no || "—",
    },
    {
      key: "license_expiry_date",
      label: tr(t, "dashboard.compliance.expiry", "الانتهاء"),
      render: (row) => fmtDate(row.license_expiry_date),
    },
  ];

  const driversColumns: DataTableColumn<DashboardComplianceDriverItem>[] = [
    {
      key: "full_name",
      label: tr(t, "dashboard.columns.driver", "السائق"),
      render: (row) => row.full_name || "—",
    },
    {
      key: "license_no",
      label: tr(t, "dashboard.compliance.licenseNo", "رقم الرخصة"),
      render: (row) => row.license_no || "—",
    },
    {
      key: "license_expiry_date",
      label: tr(t, "dashboard.compliance.expiry", "الانتهاء"),
      render: (row) => fmtDate(row.license_expiry_date),
    },
  ];

  const topExpenseTypeRows = useMemo(
    () => (summary?.tables?.top_expense_types_today as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const expenseTypeColumns: DataTableColumn<GenericRow>[] = [
    {
      key: "expense_type",
      label: tr(t, "dashboard.columns.type", "النوع"),
      render: (row) => String(row.expense_type ?? "—"),
    },
    {
      key: "amount",
      label: tr(t, "dashboard.columns.amount", "المبلغ"),
      render: (row) => fmtMoney(row.amount),
    },
  ];

  const showOperations = tab === "operations";
  const showFinance = tab === "finance";
  const showMaintenance = tab === "maintenance";
  const showDev = tab === "dev";

  return (
    <div className="space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title={tr(t, "dashboard.title", "لوحة التحكم")}
        subtitle={tr(t, "notifications.subtitle", "ملخص العمليات والتنبيهات والالتزام")}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/alerts">
              <Button variant="secondary">{tr(t, "notifications.title", "التنبيهات")}</Button>
            </Link>
            <Button onClick={load} isLoading={loading}>
              {tr(t, "common.refresh", "تحديث")}
            </Button>
          </div>
        }
      />

      <TabsBar<DashboardTabKey> tabs={tabs} value={tab} onChange={setTab} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <DashboardAssistantPanel context={assistantContext} />
        </div>

        <div className="xl:col-span-2">
          <DashboardInsightsPanel context={assistantContext} />
        </div>
      </div>

      {err ? (
        <Card className="border-red-500/20">
          <div className="text-sm text-red-600">{err}</div>
        </Card>
      ) : null}

      {showOperations && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={tr(t, "dashboard.ops.kpis.tripsToday", "رحلات اليوم")}
              value={fmtInt(summary?.cards?.trips_today?.total)}
              hint={tr(t, "dashboard.ops.kpis.allStatuses", "كل الحالات")}
            />
            <StatCard
              label={tr(t, "dashboard.ops.activeTripsNow.title", "الرحلات النشطة الآن")}
              value={fmtInt(summary?.alerts?.active_trips_now_count)}
              hint={tr(t, "dashboard.ops.activeTripsNow.hintOn", "مُسندة / قيد التنفيذ")}
            />
            <StatCard
              label={tr(t, "dashboard.ops.tripsNeedingFinanceClose.title", "رحلات تحتاج إغلاق مالي")}
              value={fmtInt(summary?.alerts?.trips_completed_not_closed)}
              hint={tr(t, "dashboard.ops.tripsNeedingFinanceClose.hintOn", "رحلات مكتملة تنتظر التسوية")}
            />
            <StatCard
              label={tr(t, "alertsPage.unread", "غير مقروء")}
              value={fmtInt(alertsSummary?.unread)}
              hint={`${tr(t, "common.total", "الإجمالي")}: ${fmtInt(alertsSummary?.total)}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DataTable<DashboardAlertRow>
              title={tr(t, "alerts.latestTableTitle", "آخر التنبيهات")}
              columns={recentAlertsColumns}
              rows={alertsList}
              loading={loading}
              emptyTitle={tr(t, "alerts.emptyTitle", "لا توجد تنبيهات حالية")}
              emptyHint={tr(t, "alerts.emptyHint", "النظام لا يحتوي على تنبيهات مفتوحة الآن")}
            />

            <Card title={tr(t, "dashboard.ops.trendTitle", "اتجاه الرحلات (آخر 14 يوم)")}>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium">
                    {tr(t, "dashboard.ops.charts.tripsCreated", "رحلات تم إنشاؤها")}
                  </div>
                  <div className="space-y-2">
                    {(trendsBundle?.trips_created ?? []).map((point, index) => (
                      <div
                        key={`${point.label}-${index}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-600">{point.label}</span>
                        <span className="font-semibold">{fmtInt(point.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">
                    {tr(t, "dashboard.ops.charts.tripsAssigned", "رحلات تم إسنادها")}
                  </div>
                  <div className="space-y-2">
                    {(trendsBundle?.trips_assigned ?? []).map((point, index) => (
                      <div
                        key={`${point.label}-${index}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-600">{point.label}</span>
                        <span className="font-semibold">{fmtInt(point.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DataTable<GenericRow>
              title={tr(t, "dashboard.ops.tables.activeTripsNow", "الرحلات النشطة الآن")}
              columns={activeTripsColumns}
              rows={activeTripsRows}
              loading={loading}
              emptyTitle={tr(t, "dashboard.ops.empty.activeTripsNow.title", "لا توجد رحلات نشطة الآن")}
              emptyHint={tr(t, "dashboard.ops.empty.activeTripsNow.hint", "✓ كل المركبات متوقفة")}
            />

            <DataTable<GenericRow>
              title={tr(t, "dashboard.ops.tables.tripsNeedingClose", "رحلات تحتاج إغلاق مالي")}
              columns={financeCloseColumns}
              rows={financeCloseRows}
              loading={loading}
              emptyTitle={tr(t, "dashboard.ops.empty.tripsNeedingClose.title", "لا توجد رحلات تحتاج إغلاق")}
              emptyHint={tr(t, "dashboard.ops.empty.tripsNeedingClose.hint", "✓ كل شيء تمت تسويته")}
            />
          </div>
        </>
      )}

      {showFinance && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={tr(t, "dashboard.finance.pendingTooLong.title", "مصروفات معلقة لفترة طويلة")}
              value={fmtInt(summary?.alerts?.expenses_pending_too_long)}
              hint={tr(t, "dashboard.finance.pendingTooLong.hintOn", "تحتاج مراجعة/اعتماد")}
            />
            <StatCard
              label={tr(t, "dashboard.finance.openAdvances.title", "سلف مفتوحة")}
              value={fmtInt(summary?.alerts?.advances_open)}
              hint={tr(t, "dashboard.finance.openAdvances.hintOn", "السلف تحتاج تسوية")}
            />
            <StatCard
              label={tr(t, "dashboard.finance.arDueSoon.title", "فواتير عملاء مستحقة قريبًا")}
              value={fmtMoney(summary?.alerts?.ar_due_soon_total)}
              hint={tr(t, "dashboard.finance.arDueSoon.hintOn", "إجمالي المستحقات: {total}", {
                total: fmtMoney(summary?.alerts?.ar_due_soon_total),
              })}
            />
            <StatCard
              label={tr(t, "dashboard.finance.arOverdue.title", "فواتير عملاء متأخرة")}
              value={fmtMoney(summary?.alerts?.ar_overdue_total)}
              hint={tr(t, "dashboard.finance.arOverdue.hintOn", "إجمالي المتأخرات: {total}", {
                total: fmtMoney(summary?.alerts?.ar_overdue_total),
              })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DataTable<GenericRow>
              title={tr(t, "dashboard.finance.topExpenseTypesToday.tableTitle", "أعلى أنواع المصروفات اليوم")}
              columns={expenseTypeColumns}
              rows={topExpenseTypeRows}
              loading={loading}
              emptyTitle={tr(t, "dashboard.finance.empty.noApprovedToday.title", "لا توجد مصروفات معتمدة اليوم")}
              emptyHint={tr(t, "dashboard.finance.empty.noApprovedToday.hint", "لا توجد بيانات للعرض")}
            />

            <Card title={tr(t, "dashboard.finance.actionRequired", "المالية – إجراءات مطلوبة")}>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium">
                    {tr(t, "dashboard.finance.pendingTooLong.title", "مصروفات معلقة لفترة طويلة")}
                  </div>
                  <div className="text-2xl font-semibold">
                    {fmtInt(summary?.alerts?.expenses_pending_too_long)}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">
                    {tr(t, "dashboard.finance.openAdvances.title", "سلف مفتوحة")}
                  </div>
                  <div className="text-2xl font-semibold">
                    {fmtInt(summary?.cards?.advances_outstanding?.count)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {tr(t, "financeAdvanceDetails.kpis.remaining", "المتبقي")}:{" "}
                    {fmtMoney(summary?.cards?.advances_outstanding?.remaining_total)}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DataTable<GenericRow>
              title={tr(t, "financeDashboard.sections.pendingHeader", "المصروفات المعلقة")}
              columns={pendingExpensesColumns}
              rows={pendingExpensesRows}
              loading={loading}
              emptyTitle={tr(t, "financeDashboard.empty.noPending", "لا توجد مصروفات معلقة")}
              emptyHint={tr(t, "common.noData", "لا توجد بيانات")}
            />

            <DataTable<GenericRow>
              title={tr(t, "financeDashboard.sections.advancesHeader", "السلف المفتوحة")}
              columns={advancesColumns}
              rows={openAdvancesRows}
              loading={loading}
              emptyTitle={tr(t, "financeDashboard.empty.noOpenAdvances", "لا توجد سلف مفتوحة")}
              emptyHint={tr(t, "common.noData", "لا توجد بيانات")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DataTable<GenericRow>
              title={tr(t, "dashboard.finance.topArOverdue.sectionTitle", "أهم فواتير العملاء المتأخرة")}
              columns={invoiceColumns}
              rows={overdueInvoicesRows}
              loading={loading}
              emptyTitle={tr(t, "dashboard.finance.topArOverdue.emptyTitle", "لا توجد فواتير عملاء متأخرة")}
              emptyHint={tr(t, "dashboard.finance.topArOverdue.emptyHint", "كل الفواتير الحالية ضمن المدة أو مسددة بالكامل")}
            />

            <DataTable<GenericRow>
              title={tr(t, "dashboard.finance.topArDueSoon.sectionTitle", "أهم فواتير العملاء المستحقة قريبًا")}
              columns={invoiceColumns}
              rows={dueSoonInvoicesRows}
              loading={loading}
              emptyTitle={tr(t, "dashboard.finance.topArDueSoon.emptyTitle", "لا توجد فواتير مستحقة قريبًا")}
              emptyHint={tr(t, "dashboard.finance.topArDueSoon.emptyHint", "لا توجد فواتير خلال نافذة 7 أيام القادمة")}
            />
          </div>
        </>
      )}

      {showMaintenance && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={tr(t, "dashboard.maintenance.openWorkOrders.title", "أوامر عمل مفتوحة")}
              value={fmtInt(summary?.cards?.maintenance?.open_work_orders)}
              hint={tr(t, "dashboard.maintenance.openWorkOrders.hintOn", "أوامر عمل في OPEN / IN_PROGRESS")}
            />
            <StatCard
              label={tr(t, "dashboard.maintenance.qaNeeds.title", "QA يحتاج إجراء")}
              value={fmtInt(summary?.cards?.maintenance?.qa_needs)}
              hint={tr(t, "dashboard.maintenance.qaNeeds.hintOn", "أوامر مكتملة بدون تقرير بعدي")}
            />
            <StatCard
              label={tr(t, "dashboard.maintenance.qaFailed.title", "QA فشل")}
              value={fmtInt(summary?.cards?.maintenance?.qa_failed)}
              hint={tr(t, "dashboard.maintenance.qaFailed.hintOn", "تقارير اختبار طريق فاشلة")}
            />
            <StatCard
              label={tr(t, "dashboard.maintenance.partsMismatch.title", "عدم تطابق قطع")}
              value={fmtInt(summary?.cards?.maintenance?.parts_mismatch)}
              hint={tr(t, "dashboard.maintenance.partsMismatch.hintOn", "اختلاف بين المصروف والمركّب")}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={tr(t, "dashboard.maintenance.completedToday.title", "مكتملة اليوم")}
              value={fmtInt(summary?.cards?.maintenance?.completed_today)}
              hint={tr(t, "dashboard.maintenance.completedToday.sub", "أوامر عمل مكتملة")}
            />
            <StatCard
              label={tr(t, "dashboard.maintenance.partsCostToday.title", "تكلفة قطع اليوم")}
              value={fmtMoney(summary?.cards?.maintenance?.maintenance_parts_cost_today)}
              hint={tr(t, "dashboard.maintenance.partsCostToday.sub", "إجمالي أذونات الصرف")}
            />
            <StatCard
              label={tr(t, "dashboard.maintenance.cashCostToday.title", "تكلفة نقدية اليوم")}
              value={fmtMoney(summary?.cards?.maintenance?.maintenance_cash_cost_today)}
              hint={tr(t, "dashboard.maintenance.cashCostToday.sub", "مصروفات نقدية مرتبطة")}
            />
            <StatCard
              label={tr(t, "dashboard.maintenance.totalCostToday.title", "إجمالي التكلفة اليوم")}
              value={fmtMoney(summary?.cards?.maintenance?.maintenance_cost_today)}
              hint={tr(t, "dashboard.maintenance.totalCostToday.sub", "قطع + نقدي")}
            />
          </div>

          <DataTable<GenericRow>
            title={tr(t, "dashboard.maintenance.recentWorkOrders.tableTitle", "أوامر عمل صيانة (الأحدث)")}
            columns={maintenanceColumns}
            rows={maintenanceRows}
            loading={loading}
            emptyTitle={tr(t, "dashboard.maintenance.empty.noWorkOrders.title", "لا توجد أوامر عمل")}
            emptyHint={tr(t, "dashboard.maintenance.empty.noWorkOrders.hint", "لم يتم العثور على أوامر عمل حديثة.")}
          />
        </>
      )}

      {showDev && (
        <Card title={tr(t, "dashboard.dev.title", "تبويب المطور")}>
  <div className="text-sm text-slate-600">
    {tr(t, "dashboard.dev.hint", "مخصص لتشخيصات التطوير.")}
  </div>
</Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DataTable<DashboardComplianceVehicleItem>
          title={tr(t, "dashboard.compliance.vehiclesTable", "المركبات الأقرب لانتهاء الرخصة")}
          subtitle={`${fmtInt(compliance?.counts?.vehicles?.expiring)} ${tr(t, "common.rows", "صف")}`}
          columns={vehiclesColumns}
          rows={vehicleExpiringRows}
          loading={loading}
          emptyTitle={tr(t, "dashboard.compliance.vehiclesEmptyTitle", "لا توجد مركبات قرب انتهاء الرخصة")}
          emptyHint={tr(t, "dashboard.compliance.vehiclesEmptyHint", "لا توجد عناصر ضمن نطاق التنبيه الحالي")}
        />

        <DataTable<DashboardComplianceDriverItem>
          title={tr(t, "dashboard.compliance.driversTable", "السائقين الأقرب لانتهاء الرخصة")}
          subtitle={`${fmtInt(compliance?.counts?.drivers?.expiring)} ${tr(t, "common.rows", "صف")}`}
          columns={driversColumns}
          rows={driverExpiringRows}
          loading={loading}
          emptyTitle={tr(t, "dashboard.compliance.driversEmptyTitle", "لا يوجد سائقين قرب انتهاء الرخصة")}
          emptyHint={tr(t, "dashboard.compliance.driversEmptyHint", "لا توجد عناصر ضمن نطاق التنبيه الحالي")}
        />
      </div>
    </div>
  );
}