"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { DashboardAssistantPanel } from "@/src/components/dashboard/DashboardAssistantPanel";
import { DashboardInsightsPanel } from "@/src/components/dashboard/DashboardInsightsPanel";
import { DashboardEntityPanel } from "@/src/components/dashboard/DashboardEntityPanel";
import { TripIntelligenceSection } from "@/src/components/dashboard/TripIntelligenceSection";
import {
  DashboardGrid,
  DashboardSection,
  DashboardStatCard,
  DashboardTabButton,
} from "@/src/components/dashboard/DashboardUi";

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
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs",
        cls
      )}
    >
      {label}
    </span>
  );
}

type GenericRow = Record<string, unknown>;

export default function DashboardPage() {
  const t = useT();

  const [tab, setTab] = useState<DashboardTabKey>("operations");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState<string | null>(null);
  const [assistantSnapshot, setAssistantSnapshot] = useState<any>(null);

  function askAssistant(question: string) {
    setAssistantQuestion(question);

    setTimeout(() => {
      document.getElementById("dashboard-assistant-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [trendsBundle, setTrendsBundle] =
    useState<DashboardTrendsBundle | null>(null);
  const [compliance, setCompliance] =
    useState<DashboardComplianceResponse | null>(null);
  const [alertsList, setAlertsList] = useState<DashboardAlertRow[]>([]);
  const [alertsSummary, setAlertsSummary] =
    useState<DashboardAlertsSummary | null>(null);

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
          ? String(
              (e as { message?: string }).message ||
                tr(t, "common.failed", "فشل")
            )
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
      {
        key: "maintenance" as const,
        label: tr(t, "tabs.maintenance", "الصيانة"),
      },
      { key: "dev" as const, label: tr(t, "tabs.dev", "المطور") },
    ],
    [t]
  );

  const activeTripsRows = useMemo(
    () => (summary?.tables?.active_trips_now as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const financeCloseRows = useMemo(
    () =>
      (summary?.tables?.trips_needing_finance_close as
        | GenericRow[]
        | undefined) ?? [],
    [summary]
  );

  const pendingExpensesRows = useMemo(
    () =>
      (summary?.tables?.pending_expenses_top10 as GenericRow[] | undefined) ??
      [],
    [summary]
  );

  const openAdvancesRows = useMemo(
    () =>
      (summary?.tables?.advances_open_top10 as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const overdueInvoicesRows = useMemo(
    () =>
      (summary?.tables?.top_ar_overdue_invoices as GenericRow[] | undefined) ??
      [],
    [summary]
  );

  const dueSoonInvoicesRows = useMemo(
    () =>
      (summary?.tables?.top_ar_due_soon_invoices as GenericRow[] | undefined) ??
      [],
    [summary]
  );

  const maintenanceRows = useMemo(
    () =>
      (summary?.tables?.maintenance_recent_work_orders as
        | GenericRow[]
        | undefined) ?? [],
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

  const topExpenseTypeRows = useMemo(
    () =>
      (summary?.tables?.top_expense_types_today as GenericRow[] | undefined) ??
      [],
    [summary]
  );

  const showOperations = tab === "operations";
  const showFinance = tab === "finance";
  const showMaintenance = tab === "maintenance";
  const showDev = tab === "dev";

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
          <span className="font-mono text-xs text-slate-500">
            {shortId(row.entity_id)}
          </span>
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
      label: tr(t, "dashboard.columns.days", "الأيام"),
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
      label: tr(t, "dashboard.compliance.vehicle", "المركبة"),
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

  return (
    <div className="space-y-5">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title={tr(t, "dashboard.title", "لوحة التحكم")}
        subtitle={tr(
          t,
          "dashboard.subtitle",
          "نظرة تشغيلية ومالية سريعة على النظام."
        )}
        actions={
          <Button variant="secondary" onClick={load} isLoading={loading}>
            {tr(t, "common.refresh", "تحديث")}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-3xl border border-black/10 bg-white p-2 shadow-sm">
        {tabs.map((item) => (
          <DashboardTabButton
            key={item.key}
            active={tab === item.key}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </DashboardTabButton>
        ))}
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {showOperations ? (
        <div className="space-y-5">
          <DashboardGrid>
            <DashboardStatCard
              label={tr(t, "dashboard.ops.kpis.tripsToday", "رحلات اليوم")}
              value={fmtInt(summary?.cards?.trips_today?.total)}
              hint={tr(t, "dashboard.ops.kpis.allStatuses", "كل الحالات")}
              tone="info"
            />

            <DashboardStatCard
              label={tr(
                t,
                "dashboard.ops.activeTripsNow.title",
                "الرحلات النشطة الآن"
              )}
              value={fmtInt(summary?.alerts?.active_trips_now_count)}
              hint={tr(
                t,
                "dashboard.ops.activeTripsNow.hintOn",
                "مُسندة / قيد التنفيذ"
              )}
              tone="success"
            />

            <DashboardStatCard
              label={tr(
                t,
                "dashboard.ops.tripsNeedingFinanceClose.title",
                "رحلات تحتاج إغلاق مالي"
              )}
              value={fmtInt(summary?.alerts?.trips_completed_not_closed)}
              hint={tr(
                t,
                "dashboard.ops.tripsNeedingFinanceClose.hintOn",
                "رحلات مكتملة تنتظر التسوية"
              )}
              tone={
                Number(summary?.alerts?.trips_completed_not_closed || 0) > 0
                  ? "warn"
                  : "success"
              }
            />

            <DashboardStatCard
              label={tr(t, "alertsPage.unread", "غير مقروء")}
              value={fmtInt(alertsSummary?.unread)}
              hint={`${tr(t, "common.total", "الإجمالي")}: ${fmtInt(
                alertsSummary?.total
              )}`}
              tone={
                Number(alertsSummary?.unread || 0) > 0 ? "danger" : "success"
              }
            />
          </DashboardGrid>

          <TripIntelligenceSection />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DataTable<GenericRow>
              title={tr(t, "dashboard.ops.activeTripsNow.table", "الرحلات النشطة")}
              columns={activeTripsColumns}
              rows={activeTripsRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />

            <DataTable<GenericRow>
              title={tr(
                t,
                "dashboard.ops.tripsNeedingFinanceClose.table",
                "رحلات تحتاج إغلاق مالي"
              )}
              columns={financeCloseColumns}
              rows={financeCloseRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />
          </div>

          <DashboardChartsPanel trendsBundle={trendsBundle} loading={loading} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-3">
              <DashboardInsightsPanel context="trips" onAsk={askAssistant} />
            </div>

            <div className="xl:col-span-6" id="dashboard-assistant-panel">
              <DashboardAssistantPanel
                context="trips"
                externalQuestion={assistantQuestion}
                onExternalQuestionHandled={() => setAssistantQuestion(null)}
                onSessionSnapshotChange={setAssistantSnapshot}
              />
            </div>

            <div className="xl:col-span-3">
              <DashboardEntityPanel
                snapshot={assistantSnapshot}
                onAsk={askAssistant}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showFinance ? (
        <div className="space-y-5">
          <DashboardGrid>
            <DashboardStatCard
              label={tr(t, "dashboard.finance.pendingExpenses", "مصروفات معلقة")}
              value={fmtInt(summary?.alerts?.expenses_pending_too_long)}
              hint={tr(t, "dashboard.finance.pendingHint", "أكثر من 48 ساعة")}
              tone={
                Number(summary?.alerts?.expenses_pending_too_long || 0) > 0
                  ? "warn"
                  : "success"
              }
            />

            <DashboardStatCard
              label={tr(t, "dashboard.finance.openAdvances", "سلف مفتوحة")}
              value={fmtInt(summary?.alerts?.advances_open)}
              hint={tr(t, "dashboard.finance.openAdvancesHint", "تحتاج تسوية")}
              tone={
                Number(summary?.alerts?.advances_open || 0) > 0
                  ? "warn"
                  : "success"
              }
            />

            <DashboardStatCard
              label={tr(t, "dashboard.finance.dueSoon", "فواتير مستحقة قريبًا")}
              value={fmtInt(summary?.alerts?.ar_due_soon_total)}
              hint={tr(t, "dashboard.finance.dueSoonHint", "خلال الأيام القادمة")}
              tone={
                Number(summary?.alerts?.ar_due_soon_total || 0) > 0
                  ? "info"
                  : "success"
              }
            />

            <DashboardStatCard
              label={tr(t, "dashboard.finance.overdue", "فواتير متأخرة")}
              value={fmtInt(summary?.alerts?.ar_overdue_total)}
              hint={tr(t, "dashboard.finance.overdueHint", "تحتاج تحصيل")}
              tone={
                Number(summary?.alerts?.ar_overdue_total || 0) > 0
                  ? "danger"
                  : "success"
              }
            />
          </DashboardGrid>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DataTable<GenericRow>
              title={tr(
                t,
                "dashboard.finance.pendingExpensesTable",
                "أعلى المصروفات المعلقة"
              )}
              columns={pendingExpensesColumns}
              rows={pendingExpensesRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />

            <DataTable<GenericRow>
              title={tr(t, "dashboard.finance.openAdvancesTable", "السلف المفتوحة")}
              columns={advancesColumns}
              rows={openAdvancesRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DataTable<GenericRow>
              title={tr(t, "dashboard.finance.overdueInvoices", "الفواتير المتأخرة")}
              columns={invoiceColumns}
              rows={overdueInvoicesRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />

            <DataTable<GenericRow>
              title={tr(t, "dashboard.finance.dueSoonInvoices", "فواتير مستحقة قريبًا")}
              columns={invoiceColumns}
              rows={dueSoonInvoicesRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DataTable<GenericRow>
              title={tr(t, "dashboard.finance.expenseTypes", "أعلى أنواع المصروف")}
              columns={expenseTypeColumns}
              rows={topExpenseTypeRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />

            <DashboardChartsPanel trendsBundle={trendsBundle} loading={loading} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-3">
              <DashboardInsightsPanel context="finance" onAsk={askAssistant} />
            </div>

            <div className="xl:col-span-6" id="dashboard-assistant-panel">
              <DashboardAssistantPanel
                context="finance"
                externalQuestion={assistantQuestion}
                onExternalQuestionHandled={() => setAssistantQuestion(null)}
                onSessionSnapshotChange={setAssistantSnapshot}
              />
            </div>

            <div className="xl:col-span-3">
              <DashboardEntityPanel
                snapshot={assistantSnapshot}
                onAsk={askAssistant}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showMaintenance ? (
        <div className="space-y-5">
          <DashboardGrid>
            <DashboardStatCard
              label={tr(
                t,
                "dashboard.maintenance.openWorkOrders",
                "أوامر عمل مفتوحة"
              )}
              value={fmtInt(summary?.cards?.maintenance?.open_work_orders)}
              hint={tr(t, "dashboard.maintenance.openHint", "OPEN / IN_PROGRESS")}
              tone={
                Number(summary?.cards?.maintenance?.open_work_orders || 0) > 0
                  ? "warn"
                  : "success"
              }
            />

            <DashboardStatCard
              label={tr(t, "dashboard.maintenance.qaNeeds", "تحتاج QA")}
              value={fmtInt(summary?.cards?.maintenance?.qa_needs)}
              hint={tr(
                t,
                "dashboard.maintenance.qaNeedsHint",
                "مكتملة بدون تقرير"
              )}
              tone={
                Number(summary?.cards?.maintenance?.qa_needs || 0) > 0
                  ? "warn"
                  : "success"
              }
            />

            <DashboardStatCard
              label={tr(t, "dashboard.maintenance.qaFailed", "QA فشل")}
              value={fmtInt(summary?.cards?.maintenance?.qa_failed)}
              hint={tr(t, "dashboard.maintenance.qaFailedHint", "تحتاج مراجعة")}
              tone={
                Number(summary?.cards?.maintenance?.qa_failed || 0) > 0
                  ? "danger"
                  : "success"
              }
            />

            <DashboardStatCard
              label={tr(
                t,
                "dashboard.maintenance.partsMismatch",
                "عدم تطابق قطع"
              )}
              value={fmtInt(summary?.cards?.maintenance?.parts_mismatch)}
              hint={tr(
                t,
                "dashboard.maintenance.partsMismatchHint",
                "مصروف / مركب"
              )}
              tone={
                Number(summary?.cards?.maintenance?.parts_mismatch || 0) > 0
                  ? "danger"
                  : "success"
              }
            />
          </DashboardGrid>

          <DataTable<GenericRow>
            title={tr(
              t,
              "dashboard.maintenance.recentWorkOrders",
              "أوامر العمل الأخيرة"
            )}
            columns={maintenanceColumns}
            rows={maintenanceRows}
            loading={loading}
            emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
          />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DataTable<DashboardComplianceVehicleItem>
              title={tr(
                t,
                "dashboard.compliance.vehiclesExpiring",
                "رخص مركبات تقترب من الانتهاء"
              )}
              columns={vehiclesColumns}
              rows={vehicleExpiringRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />

            <DataTable<DashboardComplianceDriverItem>
              title={tr(
                t,
                "dashboard.compliance.driversExpiring",
                "رخص سائقين تقترب من الانتهاء"
              )}
              columns={driversColumns}
              rows={driverExpiringRows}
              loading={loading}
              emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-3">
              <DashboardInsightsPanel context="maintenance" onAsk={askAssistant} />
            </div>

            <div className="xl:col-span-6" id="dashboard-assistant-panel">
              <DashboardAssistantPanel
                context="maintenance"
                externalQuestion={assistantQuestion}
                onExternalQuestionHandled={() => setAssistantQuestion(null)}
                onSessionSnapshotChange={setAssistantSnapshot}
              />
            </div>

            <div className="xl:col-span-3">
              <DashboardEntityPanel
                snapshot={assistantSnapshot}
                onAsk={askAssistant}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showDev ? (
        <div className="space-y-5">
          <DashboardSection title={tr(t, "dashboard.dev.title", "معلومات المطور")}>
            <DashboardGrid cols={3}>
              <DashboardStatCard
                label="Summary loaded"
                value={summary ? "Yes" : "No"}
                tone={summary ? "success" : "warn"}
              />

              <DashboardStatCard
                label="Trends loaded"
                value={trendsBundle ? "Yes" : "No"}
                tone={trendsBundle ? "success" : "warn"}
              />

              <DashboardStatCard
                label="Alerts loaded"
                value={alertsList.length}
                tone={alertsList.length ? "info" : "neutral"}
              />
            </DashboardGrid>
          </DashboardSection>

          <DashboardChartsPanel trendsBundle={trendsBundle} loading={loading} />

          <DataTable<DashboardAlertRow>
            title={tr(t, "dashboard.alerts.recent", "آخر التنبيهات")}
            columns={recentAlertsColumns}
            rows={alertsList}
            loading={loading}
            emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
          />
        </div>
      ) : null}

      {!showDev ? (
        <DataTable<DashboardAlertRow>
          title={tr(t, "dashboard.alerts.recent", "آخر التنبيهات")}
          columns={recentAlertsColumns}
          rows={alertsList}
          loading={loading}
          emptyTitle={tr(t, "common.noData", "لا توجد بيانات")}
        />
      ) : null}
    </div>
  );
}

function DashboardChartsPanel({
  trendsBundle,
  loading,
}: {
  trendsBundle: DashboardTrendsBundle | null;
  loading: boolean;
}) {
  const raw = trendsBundle as any;

  const groups =
    raw?.data ||
    raw?.items ||
    raw?.trends ||
    raw?.metrics ||
    raw?.bundle ||
    raw ||
    {};

  const entries = Object.entries(groups || {})
    .filter(([, value]) => Array.isArray(value))
    .slice(0, 4) as Array<[string, Array<Record<string, unknown>>]>;

  return (
    <Card title="الرسومات البيانية والإحصائية">
      {loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04]" />
          <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04]" />
        </div>
      ) : entries.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {entries.map(([key, rows]) => (
            <MiniBarChart key={key} title={key} rows={rows} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-6 text-center text-sm text-slate-500">
          لا توجد بيانات رسوم بيانية متاحة حاليًا.
        </div>
      )}
    </Card>
  );
}

function MiniBarChart({
  title,
  rows,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
}) {
  const normalized = rows.slice(-10).map((row, index) => {
    const label =
      row.label ??
      row.date ??
      row.day ??
      row.month ??
      row.name ??
      row.key ??
      `#${index + 1}`;

    const value =
      Number(
        row.value ??
          row.count ??
          row.total ??
          row.amount ??
          row.total_amount ??
          row.revenue ??
          row.expense ??
          0
      ) || 0;

    return { label: String(label), value };
  });

  const max = Math.max(...normalized.map((x) => x.value), 1);

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-[rgb(var(--trex-fg))]">
        {title}
      </div>

      <div className="space-y-3">
        {normalized.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span className="truncate">{item.label}</span>
              <span>{fmtMoney(item.value)}</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{
                  width: `${Math.max(
                    4,
                    Math.min(100, (item.value / max) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}