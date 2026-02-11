"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useSearchParams } from "next/navigation";
import { Toast } from "@/src/components/Toast";
import { useT } from "@/src/i18n/useT";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

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

function StatusBadge({ s }: { s: string }) {
  const st = String(s || "").toUpperCase();
  const cls =
    st === "APPROVED" || st === "REAPPROVED"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
      : st === "REJECTED"
      ? "bg-red-500/15 text-red-200 border-red-500/20"
      : st === "PENDING" || st === "IN_REVIEW" || st === "OPEN"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
      : "bg-white/5 text-slate-200 border-white/10";
  return <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>{st || "—"}</span>;
}

function SourceBadge({ s }: { s: string }) {
  const st = String(s || "").toUpperCase();
  const cls =
    st === "COMPANY"
      ? "bg-sky-500/15 text-sky-200 border-sky-500/20"
      : "bg-violet-500/15 text-violet-200 border-violet-500/20";
  return <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>{st || "—"}</span>;
}

type TabKey = "pending" | "advances" | "alerts";

export default function FinanceDashboardPage() {
  const t = useT();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";
  const isSupervisor = role === "FIELD_SUPERVISOR";

  const [tab, setTab] = useState<TabKey>("pending");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);

  // thresholds
  const PENDING_DAYS = 7;
  const ADVANCE_OPEN_DAYS = 14;

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const expRes = await api.get("/cash/cash-expenses", {
        params: { status: "PENDING", page: 1, page_size: 200 },
      });

      const expBody = expRes as any;
      const expItems = Array.isArray(expBody) ? expBody : expBody?.items || [];
      setPendingExpenses(Array.isArray(expItems) ? expItems : []);

      const advRes = await api.get("/cash/cash-advances");
      const advItems = Array.isArray(advRes) ? advRes : (advRes as any)?.items || [];
      setAdvances(Array.isArray(advItems) ? advItems : []);

      showToast("success", t("financeDashboard.toast.refreshed"));
    } catch (e: any) {
      const m = e?.message || t("financeDashboard.errors.loadFailed");
      setErr(m);
      showToast("error", m);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // open tab from URL: /finance?tab=pending|advances|alerts
  useEffect(() => {
    const tt = String(sp.get("tab") || "").toLowerCase();
    if (tt === "pending" || tt === "advances" || tt === "alerts") setTab(tt as TabKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // supervisor visibility
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

  const kpis = useMemo(() => {
    const pendingCount = visiblePending.length;
    const pendingTotal = visiblePending.reduce((s, x) => s + Number(x.amount || 0), 0);

    const openCount = openAdvances.length;
    const openTotal = openAdvances.reduce((s, x) => s + Number(x.amount || 0), 0);

    const overduePending = visiblePending.filter((x) => daysBetween(x.created_at) >= PENDING_DAYS);
    const overdueAdv = openAdvances.filter((a) => daysBetween(a.created_at) >= ADVANCE_OPEN_DAYS);

    return {
      pendingCount,
      pendingTotal,
      openCount,
      openTotal,
      overduePendingCount: overduePending.length,
      overdueAdvCount: overdueAdv.length,
    };
  }, [visiblePending, openAdvances]);

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

  const daysLabel = (n: number) => `${n} ${t("common.days")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("financeDashboard.title")}</h1>
          <div className="text-xs text-slate-400">
            {t("common.role")}: <span className="text-slate-200">{role || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/finance/expenses"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {t("financeDashboard.actions.expenses")}
          </Link>
          <Link
            href="/finance/advances"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {t("financeDashboard.actions.advances")}
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm disabled:opacity-60"
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
          {err}
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-slate-400">{t("financeDashboard.kpi.pendingCount")}</div>
          <div className="text-lg font-semibold">{kpis.pendingCount}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-slate-400">{t("financeDashboard.kpi.pendingTotal")}</div>
          <div className="text-lg font-semibold">{fmtMoney(kpis.pendingTotal)}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-slate-400">{t("financeDashboard.kpi.openAdvances")}</div>
          <div className="text-lg font-semibold">{kpis.openCount}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-slate-400">{t("financeDashboard.kpi.openAdvancesTotal")}</div>
          <div className="text-lg font-semibold">{fmtMoney(kpis.openTotal)}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-slate-400">
            {PENDING_DAYS}+ {t("financeDashboard.kpi.daysPending")}
          </div>
          <div className="text-lg font-semibold">{kpis.overduePendingCount}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-slate-400">
            {ADVANCE_OPEN_DAYS}+ {t("financeDashboard.kpi.daysAdvances")}
          </div>
          <div className="text-lg font-semibold">{kpis.overdueAdvCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tt) => (
          <button
            key={tt.key}
            onClick={() => setTab(tt.key)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm border transition",
              tab === tt.key
                ? "bg-white/10 border-white/10 text-white"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            {tt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
        {loading ? (
          <div className="text-sm text-slate-300">{t("common.loading")}</div>
        ) : tab === "pending" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">
                {t("financeDashboard.pending.title")}{" "}
                <span className="text-xs text-slate-400">
                  ({t("financeDashboard.meta.showing")} {visiblePending.length})
                </span>
              </div>
              <Link href="/finance/expenses?status=PENDING" className="text-xs text-slate-300 hover:text-white">
                {t("financeDashboard.actions.openList")}
              </Link>
            </div>

            {visiblePending.length === 0 ? (
              <div className="text-sm text-slate-300">{t("financeDashboard.pending.empty")}</div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
                  <div className="col-span-2">{t("financeDashboard.pending.table.amount")}</div>
                  <div className="col-span-3">{t("financeDashboard.pending.table.type")}</div>
                  <div className="col-span-2">{t("financeDashboard.pending.table.source")}</div>
                  <div className="col-span-2">{t("financeDashboard.pending.table.age")}</div>
                  <div className="col-span-2">{t("financeDashboard.pending.table.created")}</div>
                  <div className="col-span-1 text-right">{t("common.view")}</div>
                </div>

                {visiblePending.slice(0, 30).map((x) => {
                  const age = daysBetween(x.created_at);
                  return (
                    <div
                      key={x.id}
                      className="grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-white/10 hover:bg-white/5"
                    >
                      <div className="col-span-2 font-medium">{fmtMoney(x.amount)}</div>
                      <div className="col-span-3">{x.expense_type || "—"}</div>
                      <div className="col-span-2">
                        <SourceBadge s={x.payment_source} />
                      </div>
                      <div className="col-span-2">
                        <span className={cn(age >= PENDING_DAYS && "text-amber-200")}>{daysLabel(age)}</span>
                      </div>
                      <div className="col-span-2 text-slate-300">{fmtDate(x.created_at)}</div>
                      <div className="col-span-1 flex justify-end">
                        <Link
                          href={`/finance/expenses/${x.id}`}
                          className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                        >
                          →
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {visiblePending.length > 30 ? (
                  <div className="p-3 text-xs text-slate-400">{t("financeDashboard.pending.moreHint")}</div>
                ) : null}
              </div>
            )}
          </div>
        ) : tab === "advances" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">
                {t("financeDashboard.advances.title")}{" "}
                <span className="text-xs text-slate-400">
                  ({t("financeDashboard.meta.showing")} {openAdvances.length})
                </span>
              </div>
              <Link href="/finance/advances" className="text-xs text-slate-300 hover:text-white">
                {t("financeDashboard.actions.openList")}
              </Link>
            </div>

            {openAdvances.length === 0 ? (
              <div className="text-sm text-slate-300">{t("financeDashboard.advances.empty")}</div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
                  <div className="col-span-4">{t("financeDashboard.advances.table.supervisor")}</div>
                  <div className="col-span-2">{t("financeDashboard.advances.table.amount")}</div>
                  <div className="col-span-2">{t("financeDashboard.advances.table.status")}</div>
                  <div className="col-span-2">{t("financeDashboard.advances.table.age")}</div>
                  <div className="col-span-1 text-right">{t("common.view")}</div>
                  <div className="col-span-1"></div>
                </div>

                {openAdvances.slice(0, 30).map((a) => {
                  const age = daysBetween(a.created_at);
                  const sup =
                    a?.users_cash_advances_supervisor?.full_name ||
                    a?.users_cash_advances_supervisor?.email ||
                    a.field_supervisor_id ||
                    "—";

                  return (
                    <div
                      key={a.id}
                      className="grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-white/10 hover:bg-white/5"
                    >
                      <div className="col-span-4">{sup}</div>
                      <div className="col-span-2 font-medium">{fmtMoney(a.amount)}</div>
                      <div className="col-span-2">
                        <StatusBadge s={a.status} />
                      </div>
                      <div className="col-span-2">
                        <span className={cn(age >= ADVANCE_OPEN_DAYS && "text-amber-200")}>{daysLabel(age)}</span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Link
                          href={`/finance/advances/${a.id}`}
                          className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                        >
                          →
                        </Link>
                      </div>
                      <div className="col-span-1"></div>
                    </div>
                  );
                })}

                {openAdvances.length > 30 ? (
                  <div className="p-3 text-xs text-slate-400">{t("financeDashboard.advances.moreHint")}</div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-slate-200">
              {t("financeDashboard.alerts.title")}{" "}
              <span className="text-xs text-slate-400">({t("financeDashboard.alerts.auto")})</span>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              <div>• {t("financeDashboard.alerts.rulePending")} {PENDING_DAYS} {t("common.days")}</div>
              <div>• {t("financeDashboard.alerts.ruleAdvances")} {ADVANCE_OPEN_DAYS} {t("common.days")}</div>
              {!isPrivileged ? <div className="mt-2 text-slate-400">{t("financeDashboard.alerts.supervisorNote")}</div> : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-200">
                  {t("financeDashboard.alerts.overduePending")} ({alerts.overduePending.length})
                </div>
                <Link href="/finance/expenses?status=PENDING" className="text-xs text-slate-300 hover:text-white">
                  {t("financeDashboard.alerts.review")}
                </Link>
              </div>

              {alerts.overduePending.length === 0 ? (
                <div className="text-sm text-slate-300">{t("financeDashboard.alerts.noOverduePending")}</div>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
                    <div className="col-span-2">{t("financeDashboard.alerts.table.age")}</div>
                    <div className="col-span-2">{t("financeDashboard.alerts.table.amount")}</div>
                    <div className="col-span-3">{t("financeDashboard.alerts.table.type")}</div>
                    <div className="col-span-2">{t("financeDashboard.alerts.table.source")}</div>
                    <div className="col-span-2">{t("financeDashboard.alerts.table.created")}</div>
                    <div className="col-span-1 text-right">{t("common.view")}</div>
                  </div>

                  {alerts.overduePending.slice(0, 20).map((x: any) => (
                    <div
                      key={x.id}
                      className="grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-white/10 hover:bg-white/5"
                    >
                      <div className="col-span-2 text-amber-200">{daysLabel(Number(x.age_days || 0))}</div>
                      <div className="col-span-2 font-medium">{fmtMoney(x.amount)}</div>
                      <div className="col-span-3">{x.expense_type || "—"}</div>
                      <div className="col-span-2">
                        <SourceBadge s={x.payment_source} />
                      </div>
                      <div className="col-span-2 text-slate-300">{fmtDate(x.created_at)}</div>
                      <div className="col-span-1 flex justify-end">
                        <Link
                          href={`/finance/expenses/${x.id}`}
                          className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                        >
                          →
                        </Link>
                      </div>
                    </div>
                  ))}

                  {alerts.overduePending.length > 20 ? (
                    <div className="p-3 text-xs text-slate-400">{t("financeDashboard.alerts.morePending")}</div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-200">
                  {t("financeDashboard.alerts.overdueAdvances")} ({alerts.overdueAdv.length})
                </div>
                <Link href="/finance/advances" className="text-xs text-slate-300 hover:text-white">
                  {t("financeDashboard.alerts.review")}
                </Link>
              </div>

              {alerts.overdueAdv.length === 0 ? (
                <div className="text-sm text-slate-300">{t("financeDashboard.alerts.noOverdueAdvances")}</div>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
                    <div className="col-span-2">{t("financeDashboard.alerts.table.age")}</div>
                    <div className="col-span-4">{t("financeDashboard.alerts.table.supervisor")}</div>
                    <div className="col-span-2">{t("financeDashboard.alerts.table.amount")}</div>
                    <div className="col-span-2">{t("financeDashboard.alerts.table.status")}</div>
                    <div className="col-span-1 text-right">{t("common.view")}</div>
                    <div className="col-span-1"></div>
                  </div>

                  {alerts.overdueAdv.slice(0, 20).map((a: any) => {
                    const sup =
                      a?.users_cash_advances_supervisor?.full_name ||
                      a?.users_cash_advances_supervisor?.email ||
                      a.field_supervisor_id ||
                      "—";

                    return (
                      <div
                        key={a.id}
                        className="grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-white/10 hover:bg-white/5"
                      >
                        <div className="col-span-2 text-amber-200">{daysLabel(Number(a.age_days || 0))}</div>
                        <div className="col-span-4">{sup}</div>
                        <div className="col-span-2 font-medium">{fmtMoney(a.amount)}</div>
                        <div className="col-span-2">
                          <StatusBadge s={a.status} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Link
                            href={`/finance/advances/${a.id}`}
                            className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                          >
                            →
                          </Link>
                        </div>
                        <div className="col-span-1"></div>
                      </div>
                    );
                  })}

                  {alerts.overdueAdv.length > 20 ? (
                    <div className="p-3 text-xs text-slate-400">{t("financeDashboard.alerts.moreAdvances")}</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!isPrivileged && !isSupervisor ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          {t("financeDashboard.limitedRole")}
        </div>
      ) : null}

      {isPrivileged ? <div className="text-xs text-slate-500">{t("financeDashboard.tip")}</div> : null}

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  );
}
