"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";

// ✅ Design System
import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { TabsBar } from "@/src/components/ui/TabsBar";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

function fmtMoney(n: any) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function daysBetween(a?: string | null, b?: string | null) {
  if (!a) return 0;
  const da = new Date(String(a));
  if (Number.isNaN(da.getTime())) return 0;
  const db = b ? new Date(String(b)) : new Date();
  const ms = db.getTime() - da.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ✅ Local small badge for payment_source (until we add SourceBadge component)
function PaymentSourceBadge({ source }: { source: any }) {
  const s = String(source || "").toUpperCase();
  const cls =
    s === "COMPANY"
      ? "bg-sky-500/15 text-sky-800 border-sky-500/20"
      : "bg-violet-500/15 text-violet-800 border-violet-500/20";

  return <span className={`px-2 py-0.5 rounded-md text-xs border ${cls}`}>{s || "—"}</span>;
}

type TabKey = "pending" | "advances" | "alerts";

export default function FinanceClientPage() {
  const t = useT();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";
  const isSupervisor = role === "FIELD_SUPERVISOR";

  const [tab, setTab] = useState<TabKey>("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Lists
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);

  // Summaries
  const [expensesSummary, setExpensesSummary] = useState<any | null>(null);
  const [advancesSummary, setAdvancesSummary] = useState<any | null>(null);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  // thresholds
  const PENDING_DAYS = 7;
  const ADVANCE_OPEN_DAYS = 14;

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [expRes, expSumRes, advRes, advSumRes] = await Promise.all([
        api.get("/cash/cash-expenses", {
          params: { status: "PENDING", page: 1, page_size: 200 },
        }),
        api.get("/cash/cash-expenses/summary", {
          params: { status: "PENDING" },
        }),
        api.get("/cash/cash-advances"),
        api.get("/cash/cash-advances/summary"),
      ]);

      const expData = (expRes as any)?.data ?? expRes;
      const expItems = Array.isArray(expData) ? expData : expData?.items || [];
      setPendingExpenses(Array.isArray(expItems) ? expItems : []);

      const expSumData = (expSumRes as any)?.data ?? expSumRes;
      setExpensesSummary(expSumData?.totals || null);

      const advData = (advRes as any)?.data ?? advRes;
      const advItems = Array.isArray(advData) ? advData : advData?.items || [];
      setAdvances(Array.isArray(advItems) ? advItems : []);

      const advSumData = (advSumRes as any)?.data ?? advSumRes;
      setAdvancesSummary(advSumData?.totals || null);

      showToast("success", t("common.refresh"));
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || t("financeDashboard.errors.loadFailed");
      setErr(msg);
      showToast("error", msg);

      setPendingExpenses([]);
      setAdvances([]);
      setExpensesSummary(null);
      setAdvancesSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // open tab from URL
  useEffect(() => {
    const v = String(sp.get("tab") || "").toLowerCase();
    if (v === "pending" || v === "advances" || v === "alerts") setTab(v as TabKey);
  }, [sp]);

  // visibility (role scoping)
  const visiblePending = useMemo(() => {
    if (!isSupervisor) return pendingExpenses;
    return pendingExpenses.filter((x) => x.created_by === user?.id);
  }, [pendingExpenses, isSupervisor, user?.id]);

  const visibleAdvances = useMemo(() => {
    if (!isSupervisor) return advances;
    return advances.filter((a) => a.field_supervisor_id === user?.id);
  }, [advances, isSupervisor, user?.id]);

  const openAdvances = useMemo(() => {
    return visibleAdvances.filter((a) => {
      const st = String(a.status || "").toUpperCase();
      return st === "OPEN" || st === "IN_REVIEW";
    });
  }, [visibleAdvances]);

  // KPIs
  const kpis = useMemo(() => {
    const pendingCount =
      expensesSummary?.countAll != null
        ? Number(expensesSummary.countAll || 0)
        : visiblePending.length;

    const pendingTotal =
      expensesSummary?.sumAll != null
        ? Number(expensesSummary.sumAll || 0)
        : visiblePending.reduce((s, x) => s + Number(x.amount || 0), 0);

    const openCount =
      advancesSummary?.openCount != null
        ? Number(advancesSummary.openCount || 0)
        : openAdvances.length;

    const openTotal =
      advancesSummary?.sumOpen != null
        ? Number(advancesSummary.sumOpen || 0)
        : openAdvances.reduce((s, x) => s + Number(x.amount || 0), 0);

    const overduePendingCount = visiblePending.filter(
      (x) => daysBetween(x.created_at) >= PENDING_DAYS
    ).length;

    const overdueAdvCount = openAdvances.filter(
      (a) => daysBetween(a.created_at) >= ADVANCE_OPEN_DAYS
    ).length;

    return {
      pendingCount,
      pendingTotal,
      openCount,
      openTotal,
      overduePendingCount,
      overdueAdvCount,
      pendingFrom: expensesSummary ? t("financeDashboard.meta.allData") : t("financeDashboard.meta.pageOnly"),
      advancesFrom: advancesSummary ? t("financeDashboard.meta.allData") : t("financeDashboard.meta.pageOnly"),
    };
  }, [expensesSummary, advancesSummary, visiblePending, openAdvances, t]);

  const alerts = useMemo(() => {
    const overduePending = visiblePending
      .map((x) => ({ ...x, age_days: daysBetween(x.created_at) }))
      .filter((x) => x.age_days >= PENDING_DAYS)
      .sort((a, b) => (b.age_days || 0) - (a.age_days || 0));

    const overdueAdv = openAdvances
      .map((a) => ({ ...a, age_days: daysBetween(a.created_at) }))
      .filter((a) => a.age_days >= ADVANCE_OPEN_DAYS)
      .sort((a, b) => (b.age_days || 0) - (a.age_days || 0));

    return { overduePending, overdueAdv };
  }, [visiblePending, openAdvances]);

  const tabs = [
    { key: "pending" as const, label: t("financeDashboard.tabs.pending") },
    { key: "advances" as const, label: t("financeDashboard.tabs.advances") },
    { key: "alerts" as const, label: t("financeDashboard.tabs.alerts") },
  ];

  // Columns (DataTable)
  const pendingColumns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        key: "amount",
        label: t("financeDashboard.tables.pending.amount"),
        className: "font-semibold",
        render: (x) => fmtMoney(x.amount),
      },
      {
        key: "expense_type",
        label: t("financeDashboard.tables.pending.type"),
        render: (x) => x.expense_type || "—",
      },
      {
        key: "payment_source",
        label: t("financeDashboard.tables.pending.source"),
        render: (x) => <PaymentSourceBadge source={x.payment_source} />,
      },
      {
        key: "age",
        label: t("financeDashboard.tables.pending.age"),
        render: (x) => {
          const age = daysBetween(x.created_at);
          return (
            <span className={age >= PENDING_DAYS ? "text-amber-700 font-semibold" : ""}>
              {t("financeDashboard.meta.days", { n: age })}
            </span>
          );
        },
      },
      {
        key: "created_at",
        label: t("financeDashboard.tables.pending.created"),
        render: (x) => <span className="text-slate-600">{fmtDate(x.created_at)}</span>,
      },
      {
        key: "view",
        label: t("financeDashboard.tables.pending.view"),
        headerClassName: "text-right",
        className: "text-right",
        render: (x) => (
          <Link
            href={`/finance/expenses/${x.id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-black/10 bg-black/[0.02] hover:bg-black/[0.04] text-slate-700"
            aria-label="View"
          >
            →
          </Link>
        ),
      },
    ],
    [t]
  );

  const advancesColumns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        key: "supervisor",
        label: t("financeDashboard.tables.advances.supervisor"),
        render: (a) => {
          const sup =
            a?.users_cash_advances_field_supervisor_idTousers?.full_name ||
            a?.users_cash_advances_field_supervisor_idTousers?.email ||
            a?.supervisors?.full_name ||
            a?.supervisor?.full_name ||
            a?.supervisor_name ||
            a.field_supervisor_id ||
            "—";
          return sup;
        },
      },
      {
        key: "amount",
        label: t("financeDashboard.tables.advances.amount"),
        className: "font-semibold",
        render: (a) => fmtMoney(a.amount),
      },
      {
        key: "status",
        label: t("financeDashboard.tables.advances.status"),
        render: (a) => <StatusBadge status={a.status} />,
      },
      {
        key: "age",
        label: t("financeDashboard.tables.advances.age"),
        render: (a) => {
          const age = daysBetween(a.created_at);
          return (
            <span className={age >= ADVANCE_OPEN_DAYS ? "text-amber-700 font-semibold" : ""}>
              {t("financeDashboard.meta.days", { n: age })}
            </span>
          );
        },
      },
      {
        key: "view",
        label: t("financeDashboard.tables.advances.view"),
        headerClassName: "text-right",
        className: "text-right",
        render: (a) => (
          <Link
            href={`/finance/advances/${a.id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-black/10 bg-black/[0.02] hover:bg-black/[0.04] text-slate-700"
            aria-label="View"
          >
            →
          </Link>
        ),
      },
    ],
    [t]
  );

  const alertsPendingColumns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        key: "age_days",
        label: t("financeDashboard.tables.alertsPending.age"),
        render: (x) => (
          <span className="text-amber-700 font-semibold">
            {t("financeDashboard.meta.days", { n: x.age_days })}
          </span>
        ),
      },
      {
        key: "amount",
        label: t("financeDashboard.tables.alertsPending.amount"),
        className: "font-semibold",
        render: (x) => fmtMoney(x.amount),
      },
      {
        key: "expense_type",
        label: t("financeDashboard.tables.alertsPending.type"),
        render: (x) => x.expense_type || "—",
      },
      {
        key: "payment_source",
        label: t("financeDashboard.tables.alertsPending.source"),
        render: (x) => <PaymentSourceBadge source={x.payment_source} />,
      },
      {
        key: "created_at",
        label: t("financeDashboard.tables.alertsPending.created"),
        render: (x) => <span className="text-slate-600">{fmtDate(x.created_at)}</span>,
      },
      {
        key: "view",
        label: t("financeDashboard.tables.alertsPending.view"),
        headerClassName: "text-right",
        className: "text-right",
        render: (x) => (
          <Link
            href={`/finance/expenses/${x.id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-black/10 bg-black/[0.02] hover:bg-black/[0.04] text-slate-700"
            aria-label="View"
          >
            →
          </Link>
        ),
      },
    ],
    [t]
  );

  const alertsAdvColumns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        key: "age_days",
        label: t("financeDashboard.tables.alertsAdvances.age"),
        render: (a) => (
          <span className="text-amber-700 font-semibold">
            {t("financeDashboard.meta.days", { n: a.age_days })}
          </span>
        ),
      },
      {
        key: "supervisor",
        label: t("financeDashboard.tables.alertsAdvances.supervisor"),
        render: (a) => {
          const sup =
            a?.users_cash_advances_field_supervisor_idTousers?.full_name ||
            a?.users_cash_advances_field_supervisor_idTousers?.email ||
            a?.supervisors?.full_name ||
            a?.supervisor?.full_name ||
            a?.supervisor_name ||
            a.field_supervisor_id ||
            "—";
          return sup;
        },
      },
      {
        key: "amount",
        label: t("financeDashboard.tables.alertsAdvances.amount"),
        className: "font-semibold",
        render: (a) => fmtMoney(a.amount),
      },
      {
        key: "status",
        label: t("financeDashboard.tables.alertsAdvances.status"),
        render: (a) => <StatusBadge status={a.status} />,
      },
      {
        key: "view",
        label: t("financeDashboard.tables.alertsAdvances.view"),
        headerClassName: "text-right",
        className: "text-right",
        render: (a) => (
          <Link
            href={`/finance/advances/${a.id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-black/10 bg-black/[0.02] hover:bg-black/[0.04] text-slate-700"
            aria-label="View"
          >
            →
          </Link>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("financeDashboard.title")}
        subtitle={
          <span className="text-slate-500">
            {t("financeDashboard.roleLabel")}:{" "}
            <span className="font-semibold text-[rgb(var(--trex-fg))]">{role || "—"}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/finance/expenses">
              <Button variant="secondary">{t("financeDashboard.actions.expenses")}</Button>
            </Link>
            <Link href="/finance/advances">
              <Button variant="secondary">{t("financeDashboard.actions.advances")}</Button>
            </Link>
            <Button onClick={load} isLoading={loading}>
              {loading ? t("common.loading") : t("financeDashboard.actions.refresh")}
            </Button>
          </div>
        }
      />

      {err ? (
        <Card
          title={t("financeDashboard.errors.loadFailed")}
          className="border-red-500/20"
        >
          <div className="text-sm text-red-600">{err}</div>
        </Card>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <KpiCard
          label={t("financeDashboard.kpis.pendingCount")}
          value={kpis.pendingCount}
          hint={kpis.pendingFrom}
        />
        <KpiCard
          label={t("financeDashboard.kpis.pendingTotal")}
          value={fmtMoney(kpis.pendingTotal)}
          hint={kpis.pendingFrom}
        />
        <KpiCard
          label={t("financeDashboard.kpis.openAdvances")}
          value={kpis.openCount}
          hint={kpis.advancesFrom}
        />
        <KpiCard
          label={t("financeDashboard.kpis.openAdvancesTotal")}
          value={fmtMoney(kpis.openTotal)}
          hint={t("financeDashboard.meta.openFromListNote")}
        />
        <KpiCard
          label={t("financeDashboard.kpis.pendingDays", { days: PENDING_DAYS })}
          value={kpis.overduePendingCount}
        />
        <KpiCard
          label={t("financeDashboard.kpis.advanceDays", { days: ADVANCE_OPEN_DAYS })}
          value={kpis.overdueAdvCount}
        />
      </div>

      {/* Tabs */}
      <TabsBar<TabKey> tabs={tabs} value={tab} onChange={setTab} />

      {/* Content */}
      {loading ? (
        <Card title={t("common.loading")}>
          <div className="text-sm text-slate-600">{t("common.loading")}</div>
        </Card>
      ) : tab === "pending" ? (
        <DataTable
          title={
            <div className="flex items-center gap-2">
              <span>{t("financeDashboard.sections.pendingHeader")}</span>
              <span className="text-xs text-slate-500">
                {t("financeDashboard.links.showing", { count: visiblePending.length })}
              </span>
            </div>
          }
          right={
            <Link href="/finance/expenses?status=PENDING">
              <Button variant="ghost">{t("financeDashboard.links.openList")}</Button>
            </Link>
          }
          columns={pendingColumns}
          rows={visiblePending.slice(0, 30)}
          emptyTitle={t("financeDashboard.empty.noPending")}
          emptyHint={t("financeDashboard.meta.tryFilters") || "جرّب تغيير الفلاتر أو البحث."}
          footer={
            visiblePending.length > 30 ? (
              <div className="text-xs text-slate-500">{t("financeDashboard.meta.showingFirst30")}</div>
            ) : null
          }
        />
      ) : tab === "advances" ? (
        <DataTable
          title={
            <div className="flex items-center gap-2">
              <span>{t("financeDashboard.sections.advancesHeader")}</span>
              <span className="text-xs text-slate-500">
                {t("financeDashboard.links.showing", { count: openAdvances.length })}
              </span>
            </div>
          }
          right={
            <Link href="/finance/advances">
              <Button variant="ghost">{t("financeDashboard.links.openList")}</Button>
            </Link>
          }
          columns={advancesColumns}
          rows={openAdvances.slice(0, 30)}
          emptyTitle={t("financeDashboard.empty.noOpenAdvances")}
          emptyHint={t("financeDashboard.meta.tryFilters") || "جرّب تغيير الفلاتر أو البحث."}
          footer={
            openAdvances.length > 30 ? (
              <div className="text-xs text-slate-500">{t("financeDashboard.meta.showingFirst30")}</div>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          <Card
            title={
              <div className="flex items-center gap-2">
                <span>{t("financeDashboard.sections.alertsHeader")}</span>
                <span className="text-xs text-slate-500">{t("financeDashboard.sections.alertsHint")}</span>
              </div>
            }
          >
            <div className="space-y-4">
              <DataTable
                title={`${t("financeDashboard.tabs.pending")} (${alerts.overduePending.length})`}
                right={
                  <Link href="/finance/expenses?status=PENDING">
                    <Button variant="ghost">{t("financeDashboard.links.openList")}</Button>
                  </Link>
                }
                columns={alertsPendingColumns}
                rows={alerts.overduePending.slice(0, 20)}
                emptyTitle={t("financeDashboard.empty.noOverduePending")}
                emptyHint={t("financeDashboard.meta.tryFilters") || "جرّب تغيير الفلاتر أو البحث."}
                footer={
                  alerts.overduePending.length > 20 ? (
                    <div className="text-xs text-slate-500">
                      {t("financeDashboard.meta.showingFirst20Pending")}
                    </div>
                  ) : null
                }
              />

              <DataTable
                title={`${t("financeDashboard.tabs.advances")} (${alerts.overdueAdv.length})`}
                right={
                  <Link href="/finance/advances">
                    <Button variant="ghost">{t("financeDashboard.links.openList")}</Button>
                  </Link>
                }
                columns={alertsAdvColumns}
                rows={alerts.overdueAdv.slice(0, 20)}
                emptyTitle={t("financeDashboard.empty.noOverdueAdvances")}
                emptyHint={t("financeDashboard.meta.tryFilters") || "جرّب تغيير الفلاتر أو البحث."}
                footer={
                  alerts.overdueAdv.length > 20 ? (
                    <div className="text-xs text-slate-500">
                      {t("financeDashboard.meta.showingFirst20Adv")}
                    </div>
                  ) : null
                }
              />
            </div>
          </Card>
        </div>
      )}

      {!isPrivileged && !isSupervisor ? (
        <Card className="border-amber-500/20">
          <div className="text-sm text-amber-700">{t("financeDashboard.notes.roleLimited")}</div>
        </Card>
      ) : null}

      <div className="text-xs text-slate-500">{t("financeDashboard.notes.tipPrivileged")}</div>

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}