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

function SeverityBadge({ severity }: { severity?: string | null }) {
  const s = String(severity || "").toLowerCase();

  const cls =
    s === "danger"
      ? "bg-red-500/10 text-red-700 border-red-500/20"
      : s === "warn"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
      : "bg-sky-500/10 text-sky-700 border-sky-500/20";

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs", cls)}>
      {s || "info"}
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
          ? String((e as { message?: string }).message || t("common.failed"))
          : t("common.failed");

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
      { key: "operations" as const, label: t("dashboard.tabs.operations") || "العمليات" },
      { key: "finance" as const, label: t("dashboard.tabs.finance") || "المالية" },
      { key: "maintenance" as const, label: t("dashboard.tabs.maintenance") || "الصيانة" },
      { key: "dev" as const, label: t("dashboard.tabs.dev") || "التطوير" },
    ],
    [t]
  );

  const activeTripsRows = useMemo(
    () => (summary?.tables?.active_trips_now as GenericRow[] | undefined) ?? [],
    [summary]
  );

  const financeCloseRows = useMemo(
    () => (summary?.tables?.trips_needing_finance_close as GenericRow[] | undefined) ?? [],
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
      label: t("dashboard.alerts.severity") || "الأولوية",
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: "title",
      label: t("dashboard.alerts.title") || "العنوان",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium">{row.title}</div>
          <div className="text-xs text-slate-500">{row.message}</div>
        </div>
      ),
    },
    {
      key: "area",
      label: t("dashboard.alerts.area") || "المجال",
      render: (row) => row.area || "—",
    },
    {
      key: "created_at",
      label: t("dashboard.alerts.created") || "التاريخ",
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
            <Button variant="secondary">{t("common.open") || "فتح"}</Button>
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
      label: t("dashboard.tables.trip") || "الرحلة",
      render: (row) => shortId(row.trip_id),
    },
    {
      key: "vehicle",
      label: t("dashboard.tables.vehicle") || "العربية",
      render: (row) =>
        String(row.fleet_no ?? row.plate_no ?? row.vehicle_id ?? "—"),
    },
    {
      key: "supervisor",
      label: t("dashboard.tables.supervisor") || "المشرف",
      render: (row) => String(row.supervisor_name ?? row.field_supervisor_id ?? "—"),
    },
  ];

  const financeCloseColumns: DataTableColumn<GenericRow>[] = [
    {
      key: "trip_id",
      label: t("dashboard.tables.trip") || "الرحلة",
      render: (row) => shortId(row.trip_id ?? row.id),
    },
    {
      key: "trip_code",
      label: t("dashboard.tables.code") || "الكود",
      render: (row) => String(row.trip_code ?? row.code ?? "—"),
    },
    {
      key: "status",
      label: t("dashboard.tables.status") || "الحالة",
      render: (row) => String(row.financial_status ?? row.status ?? "—"),
    },
  ];

  const vehiclesColumns: DataTableColumn<DashboardComplianceVehicleItem>[] = [
    {
      key: "display_name",
      label: t("dashboard.compliance.vehicle") || "العربية",
      render: (row) => row.display_name || row.fleet_no || row.plate_no || "—",
    },
    {
      key: "license_no",
      label: t("dashboard.compliance.license") || "الرخصة",
      render: (row) => row.license_no || "—",
    },
    {
      key: "license_expiry_date",
      label: t("dashboard.compliance.expiry") || "الانتهاء",
      render: (row) => fmtDate(row.license_expiry_date),
    },
  ];

  const driversColumns: DataTableColumn<DashboardComplianceDriverItem>[] = [
    {
      key: "full_name",
      label: t("dashboard.compliance.driver") || "السائق",
      render: (row) => row.full_name || "—",
    },
    {
      key: "license_no",
      label: t("dashboard.compliance.license") || "الرخصة",
      render: (row) => row.license_no || "—",
    },
    {
      key: "license_expiry_date",
      label: t("dashboard.compliance.expiry") || "الانتهاء",
      render: (row) => fmtDate(row.license_expiry_date),
    },
  ];

  return (
    <div className="space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title={t("dashboard.title") || "لوحة المتابعة"}
        subtitle={t("dashboard.subtitle") || "ملخص العمليات والتنبيهات والالتزام"}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/alerts">
              <Button variant="secondary">{t("dashboard.actions.alerts") || "التنبيهات"}</Button>
            </Link>
            <Button onClick={load} isLoading={loading}>
              {t("common.refresh") || "تحديث"}
            </Button>
          </div>
        }
      />

      <TabsBar<DashboardTabKey> tabs={tabs} value={tab} onChange={setTab} />

      {err ? (
        <Card className="border-red-500/20">
          <div className="text-sm text-red-600">{err}</div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label={t("dashboard.cards.activeTrips") || "الرحلات النشطة الآن"}
          value={fmtInt(summary?.alerts?.active_trips_now_count)}
        />
        <StatCard
          label={t("dashboard.cards.advancesOpen") || "العهد المفتوحة"}
          value={fmtInt(summary?.alerts?.advances_open)}
        />
        <StatCard
          label={t("dashboard.cards.expensesPendingLong") || "مصروفات معلقة طويلًا"}
          value={fmtInt(summary?.alerts?.expenses_pending_too_long)}
        />
        <StatCard
          label={t("dashboard.cards.unreadAlerts") || "التنبيهات غير المقروءة"}
          value={fmtInt(alertsSummary?.unread)}
          hint={`${t("common.total") || "الإجمالي"}: ${fmtInt(alertsSummary?.total)}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label={t("dashboard.finance.arDueSoon") || "AR قريب الاستحقاق"}
          value={fmtMoney(summary?.alerts?.ar_due_soon_total)}
          hint={`${fmtInt(summary?.alerts?.ar_due_soon_count)} ${t("common.items") || "عنصر"}`}
        />
        <StatCard
          label={t("dashboard.finance.arOverdue") || "AR متأخر"}
          value={fmtMoney(summary?.alerts?.ar_overdue_total)}
          hint={`${fmtInt(summary?.alerts?.ar_overdue_count)} ${t("common.items") || "عنصر"}`}
        />
        <StatCard
          label={t("dashboard.finance.apDueSoon") || "AP قريب الاستحقاق"}
          value={fmtMoney(summary?.alerts?.ap_due_soon_total)}
          hint={`${fmtInt(summary?.alerts?.ap_due_soon_count)} ${t("common.items") || "عنصر"}`}
        />
        <StatCard
          label={t("dashboard.finance.apOverdue") || "AP متأخر"}
          value={fmtMoney(summary?.alerts?.ap_overdue_total)}
          hint={`${fmtInt(summary?.alerts?.ap_overdue_count)} ${t("common.items") || "عنصر"}`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DataTable<DashboardAlertRow>
          title={t("dashboard.sections.recentAlerts") || "أحدث التنبيهات"}
          columns={recentAlertsColumns}
          rows={alertsList}
          loading={loading}
          emptyTitle={t("dashboard.empty.noAlerts") || "لا توجد تنبيهات"}
          emptyHint={t("dashboard.empty.noAlertsHint") || "كل شيء يبدو هادئًا."}
        />

        <Card title={t("dashboard.sections.trends") || "الاتجاهات السريعة"}>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">
                {t("dashboard.trends.tripsCreated") || "الرحلات المنشأة"}
              </div>
              <div className="space-y-2">
                {(trendsBundle?.trips_created ?? []).map((point, index) => (
                  <div key={`${point.label}-${index}`} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{point.label}</span>
                    <span className="font-semibold">{fmtInt(point.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">
                {t("dashboard.trends.expensesPending") || "المصروفات المعلقة"}
              </div>
              <div className="space-y-2">
                {(trendsBundle?.expenses_pending ?? []).map((point, index) => (
                  <div key={`${point.label}-${index}`} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{point.label}</span>
                    <span className="font-semibold">{fmtInt(point.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DataTable<GenericRow>
          title={t("dashboard.sections.activeTrips") || "الرحلات النشطة الآن"}
          columns={activeTripsColumns}
          rows={activeTripsRows}
          loading={loading}
          emptyTitle={t("dashboard.empty.noActiveTrips") || "لا توجد رحلات نشطة"}
          emptyHint={t("dashboard.empty.noActiveTripsHint") || "لا توجد بيانات حالياً."}
        />

        <DataTable<GenericRow>
          title={t("dashboard.sections.financeClose") || "رحلات تحتاج إغلاق مالي"}
          columns={financeCloseColumns}
          rows={financeCloseRows}
          loading={loading}
          emptyTitle={t("dashboard.empty.noFinanceClose") || "لا توجد رحلات تحتاج إغلاق"}
          emptyHint={t("dashboard.empty.noFinanceCloseHint") || "كل شيء متابع."}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DataTable<DashboardComplianceVehicleItem>
          title={t("dashboard.sections.vehiclesExpiring") || "عربيات رخصها قربت تنتهي"}
          subtitle={`${fmtInt(compliance?.counts?.vehicles?.expiring)} ${t("common.items") || "عنصر"}`}
          columns={vehiclesColumns}
          rows={vehicleExpiringRows}
          loading={loading}
          emptyTitle={t("dashboard.empty.noVehicleCompliance") || "لا توجد عربيات قريبة الانتهاء"}
          emptyHint={t("dashboard.empty.noVehicleComplianceHint") || "الوضع جيد."}
        />

        <DataTable<DashboardComplianceDriverItem>
          title={t("dashboard.sections.driversExpiring") || "سائقون رخصهم قربت تنتهي"}
          subtitle={`${fmtInt(compliance?.counts?.drivers?.expiring)} ${t("common.items") || "عنصر"}`}
          columns={driversColumns}
          rows={driverExpiringRows}
          loading={loading}
          emptyTitle={t("dashboard.empty.noDriverCompliance") || "لا يوجد سائقون قريبون من الانتهاء"}
          emptyHint={t("dashboard.empty.noDriverComplianceHint") || "الوضع جيد."}
        />
      </div>
    </div>
  );
}