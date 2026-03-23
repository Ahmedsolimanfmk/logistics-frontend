"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { tripFinanceService } from "@/src/services/trip-finance.service";
import {
  tripRevenuesService,
  type TripRevenue,
  type TripRevenueSource,
} from "@/src/services/trip-revenues.service";

import type { TripFinanceSummary } from "@/src/types/trip-finance.types";

type TripFinanceSummaryView = TripFinanceSummary & {
  revenue?: number;
  profit?: number;
  currency?: string | null;
};

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

function num(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n: any, currency = "EGP") {
  const v = num(n);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
  }
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

type TabKey = "summary" | "revenue" | "expenses" | "actions";

function StatusBadge({ s }: { s: string }) {
  const st = String(s || "").toUpperCase();
  const cls =
    st === "OPEN"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : st === "IN_REVIEW" || st === "UNDER_REVIEW"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : st === "CLOSED"
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : "bg-white text-slate-700 border-slate-200";

  return <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>{st || "—"}</span>;
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300";

const textareaCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 min-h-[100px]";

export default function TripFinancePage() {
  const t = useT();

  const params = useParams();
  const router = useRouter();
  const tripId = String((params as any)?.id || "");

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);
  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";
  const canEditRevenue =
    role === "ADMIN" ||
    role === "ACCOUNTANT" ||
    role === "EXEC_MANAGER" ||
    role === "EXECUTIVE_MANAGER";

  const [tab, setTab] = useState<TabKey>("summary");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<TripFinanceSummaryView | null>(null);
  const [revenueRecord, setRevenueRecord] = useState<TripRevenue | null>(null);

  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueCurrency, setRevenueCurrency] = useState("EGP");
  const [revenueSource, setRevenueSource] = useState<TripRevenueSource>("MANUAL");
  const [revenueNotes, setRevenueNotes] = useState("");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [financeRes, revenueRes, profitabilityRes] = await Promise.all([
        tripFinanceService.getSummary(tripId),
        tripRevenuesService.getByTrip(tripId),
        tripRevenuesService.getProfitability(tripId),
      ]);

      const financeSummary = financeRes as TripFinanceSummary;
      const revenue = revenueRes?.data || null;
      const profitability = profitabilityRes?.data || null;

      const mergedSummary: TripFinanceSummaryView = {
        ...financeSummary,
        revenue: profitability?.revenue ?? 0,
        profit: profitability?.profit ?? 0,
        currency: profitability?.currency || revenue?.currency || "EGP",
      };

      setSummary(mergedSummary);
      setRevenueRecord(revenue);

      setRevenueAmount(revenue?.amount != null ? String(num(revenue.amount)) : "");
      setRevenueCurrency(String(revenue?.currency || profitability?.currency || "EGP"));
      setRevenueSource((revenue?.source as TripRevenueSource) || "MANUAL");
      setRevenueNotes(String(revenue?.notes || ""));
    } catch (e: any) {
      setError(e?.message || t("tripFinance.errors.loadFailed"));
      setSummary(null);
      setRevenueRecord(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tripId) return;
    load();
  }, [tripId]);

  const financeStatus = useMemo(() => {
    return (
      summary?.finance_status ||
      summary?.financial_status ||
      summary?.trip?.finance_status ||
      summary?.trip?.financial_status ||
      "UNKNOWN"
    );
  }, [summary]);

  const totals = useMemo(() => {
    const totalExpenses =
      Number(summary?.totals?.expenses_total ?? summary?.expenses_total ?? summary?.total_expenses ?? 0) || 0;

    const advanceTotal =
      Number(summary?.totals?.advances_total ?? summary?.advances_total ?? summary?.total_advances ?? 0) || 0;

    const companyTotal =
      Number(summary?.totals?.company_total ?? summary?.company_total ?? summary?.total_company ?? 0) || 0;

    const partsTotal =
      Number(summary?.totals?.parts_cost ?? summary?.parts_cost ?? summary?.total_parts_cost ?? 0) || 0;

    const maintenanceTotal =
      Number(summary?.totals?.maintenance_total ?? summary?.maintenance_total ?? 0) || 0;

    const balanceRaw = summary?.totals?.balance ?? summary?.balance;
    const balance = Number(balanceRaw ?? advanceTotal - totalExpenses) || 0;

    const revenue = Number(summary?.revenue ?? 0) || 0;
    const profit = Number(summary?.profit ?? revenue - totalExpenses) || revenue - totalExpenses;

    return {
      totalExpenses,
      advanceTotal,
      companyTotal,
      partsTotal,
      maintenanceTotal,
      balance,
      revenue,
      profit,
    };
  }, [summary]);

  const expenses: any[] = useMemo(() => {
    const arr = summary?.expenses || [];
    return Array.isArray(arr) ? arr : [];
  }, [summary]);

  const advances: any[] = useMemo(() => {
    const arr = summary?.advances || summary?.cash_advances || [];
    return Array.isArray(arr) ? arr : [];
  }, [summary]);

  async function openReview() {
    if (!isPrivileged) return;
    setBusy(true);
    setError(null);
    try {
      await tripFinanceService.openReview(tripId);
      await load();
      setTab("summary");
    } catch (e: any) {
      setError(e?.message || t("tripFinance.errors.openReviewFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function closeFinance() {
    if (!isPrivileged) return;

    const confirmText = t("tripFinance.confirm.closeText");
    if (!window.confirm(confirmText)) return;

    const notes = window.prompt(t("tripFinance.confirm.closeNotesPrompt")) || "";

    setBusy(true);
    setError(null);
    try {
      await tripFinanceService.close(tripId, notes);
      await load();
      setTab("summary");
    } catch (e: any) {
      setError(e?.message || t("tripFinance.errors.closeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveRevenue() {
    if (!canEditRevenue) return;

    const amount = Number(revenueAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("قيمة الإيراد غير صحيحة");
      setTab("revenue");
      return;
    }

    setSavingRevenue(true);
    setError(null);

    try {
      await tripRevenuesService.save({
        trip_id: tripId,
        amount,
        currency: revenueCurrency || "EGP",
        source: revenueSource,
        notes: revenueNotes.trim() || null,
      });

      await load();
      setTab("summary");
    } catch (e: any) {
      setError(e?.message || "فشل حفظ إيراد الرحلة");
      setTab("revenue");
    } finally {
      setSavingRevenue(false);
    }
  }

  const tabs = [
    { key: "summary" as const, label: t("tripFinance.tabs.summary") },
    { key: "revenue" as const, label: "الإيراد والربحية" },
    { key: "expenses" as const, label: t("tripFinance.tabs.expenses") },
    { key: "actions" as const, label: t("tripFinance.tabs.actions") },
  ];

  const currency = summary?.currency || revenueRecord?.currency || revenueCurrency || "EGP";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{t("tripFinance.title")}</h1>
              <StatusBadge s={String(financeStatus)} />
            </div>
            <div className="text-xs text-slate-600">
              {t("tripFinance.tripId")}: <span className="text-slate-900 font-semibold">{tripId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
            >
              {t("common.back")}
            </button>

            <Link
              href="/trips"
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
            >
              {t("tripFinance.trips")}
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex flex-wrap gap-2">
          {tabs.map((tt) => (
            <button
              key={tt.key}
              onClick={() => setTab(tt.key)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm border transition",
                tab === tt.key
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              {tt.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {loading ? (
            <div className="text-sm text-slate-600">{t("common.loading")}</div>
          ) : tab === "summary" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">{t("tripFinance.kpis.totalExpenses")}</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.totalExpenses, currency)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">{t("tripFinance.kpis.advancesTotal")}</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.advanceTotal, currency)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">{t("tripFinance.kpis.companyTotal")}</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.companyTotal, currency)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">{t("tripFinance.kpis.partsCost")}</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.partsTotal, currency)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الإيراد</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.revenue, currency)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الربحية</div>
                  <div className={cn("text-lg font-semibold", totals.profit >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {fmtMoney(totals.profit, currency)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">{t("tripFinance.kpis.balance")}</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.balance, currency)}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <div className="text-xs text-slate-600">{t("tripFinance.tripInfo.title")}</div>

                <div className="text-sm text-slate-800">
                  {t("tripFinance.tripInfo.code")}:{" "}
                  <span className="text-slate-900 font-semibold">
                    {summary?.trip?.trip_code || summary?.trip?.code || "—"}
                  </span>
                </div>

                <div className="text-sm text-slate-800">
                  {t("tripFinance.tripInfo.status")}:{" "}
                  <span className="text-slate-900 font-semibold">{String(summary?.trip?.status || "—")}</span>
                </div>

                <div className="text-sm text-slate-800">
                  {t("tripFinance.tripInfo.financeClosedAt")}:{" "}
                  <span className="text-slate-900 font-semibold">
                    {fmtDate(summary?.trip?.financial_closed_at || summary?.trip?.finance_closed_at || null)}
                  </span>
                </div>

                <div className="text-sm text-slate-800">
                  العملة: <span className="text-slate-900 font-semibold">{currency}</span>
                </div>

                {summary?.note ? (
                  <div className="mt-2 text-xs text-slate-600">
                    {t("tripFinance.tripInfo.note")}: <span className="text-slate-900">{String(summary.note)}</span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-800">{t("tripFinance.linkedAdvances.title")}</div>
                  <Link href="/finance/advances" className="text-xs text-slate-600 hover:text-slate-900">
                    {t("tripFinance.linkedAdvances.openList")}
                  </Link>
                </div>

                {advances.length === 0 ? (
                  <div className="mt-2 text-sm text-slate-600">{t("tripFinance.linkedAdvances.empty")}</div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {advances.slice(0, 6).map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <div className="text-slate-800">
                          {String(a.id).slice(0, 8)}… — {String(a.status || "").toUpperCase()}
                        </div>
                        <div className="text-slate-700">{fmtMoney(a.amount, currency)}</div>
                      </div>
                    ))}
                    {advances.length > 6 ? (
                      <div className="text-xs text-slate-600">+{advances.length - 6} more…</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : tab === "revenue" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الإيراد الحالي</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.revenue, currency)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">إجمالي المصروفات</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.totalExpenses, currency)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">صافي الربحية</div>
                  <div className={cn("text-lg font-semibold", totals.profit >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {fmtMoney(totals.profit, currency)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">بيانات الإيراد</div>
                  {!canEditRevenue ? (
                    <div className="text-xs text-amber-700">ليس لديك صلاحية تعديل الإيراد</div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="space-y-1">
                    <div className="text-xs text-slate-600">قيمة الإيراد</div>
                    <input
                      type="number"
                      value={revenueAmount}
                      onChange={(e) => setRevenueAmount(e.target.value)}
                      className={inputCls}
                      disabled={!canEditRevenue || savingRevenue}
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs text-slate-600">العملة</div>
                    <select
                      value={revenueCurrency}
                      onChange={(e) => setRevenueCurrency(e.target.value)}
                      className={inputCls}
                      disabled={!canEditRevenue || savingRevenue}
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="SAR">SAR</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs text-slate-600">المصدر</div>
                    <select
                      value={revenueSource}
                      onChange={(e) => setRevenueSource(e.target.value as TripRevenueSource)}
                      className={inputCls}
                      disabled={!canEditRevenue || savingRevenue}
                    >
                      <option value="MANUAL">MANUAL</option>
                      <option value="CONTRACT">CONTRACT</option>
                      <option value="INVOICE">INVOICE</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-1 block">
                  <div className="text-xs text-slate-600">ملاحظات</div>
                  <textarea
                    value={revenueNotes}
                    onChange={(e) => setRevenueNotes(e.target.value)}
                    className={textareaCls}
                    disabled={!canEditRevenue || savingRevenue}
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                    <div>
                      المصدر الحالي: <span className="font-semibold">{revenueRecord?.source || "—"}</span>
                    </div>
                    <div>
                      المدخل: <span className="font-semibold">{revenueRecord?.users_entered?.full_name || "—"}</span>
                    </div>
                    <div>
                      تاريخ الإدخال: <span className="font-semibold">{fmtDate(revenueRecord?.entered_at)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                    <div>
                      الإيراد: <span className="font-semibold">{fmtMoney(totals.revenue, currency)}</span>
                    </div>
                    <div>
                      المصروفات: <span className="font-semibold">{fmtMoney(totals.totalExpenses, currency)}</span>
                    </div>
                    <div>
                      الربحية:{" "}
                      <span className={cn("font-semibold", totals.profit >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {fmtMoney(totals.profit, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={!canEditRevenue || savingRevenue}
                    onClick={saveRevenue}
                    className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm disabled:opacity-50 text-emerald-800"
                  >
                    {savingRevenue ? "جارٍ الحفظ..." : "حفظ الإيراد"}
                  </button>

                  <button
                    disabled={savingRevenue}
                    onClick={load}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
                  >
                    تحديث
                  </button>
                </div>
              </div>
            </div>
          ) : tab === "expenses" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-800">{t("tripFinance.expensesTable.title")}</div>
                <Link href="/finance/expenses" className="text-xs text-slate-600 hover:text-slate-900">
                  {t("tripFinance.expensesTable.openList")}
                </Link>
              </div>

              {expenses.length === 0 ? (
                <div className="text-sm text-slate-600">{t("tripFinance.expensesTable.empty")}</div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-600 bg-slate-50 border-b border-slate-200">
                    <div className="col-span-2">{t("tripFinance.expensesTable.amount")}</div>
                    <div className="col-span-3">{t("tripFinance.expensesTable.type")}</div>
                    <div className="col-span-2">{t("tripFinance.expensesTable.source")}</div>
                    <div className="col-span-2">{t("tripFinance.expensesTable.status")}</div>
                    <div className="col-span-2">{t("tripFinance.expensesTable.created")}</div>
                    <div className="col-span-1 text-right">{t("tripFinance.expensesTable.view")}</div>
                  </div>

                  {expenses.map((x) => (
                    <div
                      key={x.id}
                      className="grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-slate-200 hover:bg-slate-50"
                    >
                      <div className="col-span-2 font-medium">{fmtMoney(x.amount, currency)}</div>
                      <div className="col-span-3">{x.expense_type || "—"}</div>
                      <div className="col-span-2 text-slate-800">
                        {String(x.payment_source || "").toUpperCase() || "—"}
                      </div>
                      <div className="col-span-2 text-slate-800">
                        {String(x.approval_status || "").toUpperCase() || "—"}
                      </div>
                      <div className="col-span-2 text-slate-700">{fmtDate(x.created_at)}</div>
                      <div className="col-span-1 flex justify-end">
                        <Link
                          href={`/finance/expenses/${x.id}`}
                          className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                        >
                          →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-slate-800">
                {t("tripFinance.actions.title")}{" "}
                <span className="text-xs text-slate-600">
                  (Role: {role || "—"} / Finance: {String(financeStatus).toUpperCase()})
                </span>
              </div>

              {!isPrivileged ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {t("tripFinance.actions.noPerm")}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                  <button
                    disabled={busy}
                    onClick={openReview}
                    className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-sm disabled:opacity-50 text-amber-800"
                  >
                    {t("tripFinance.actions.openReview")}
                  </button>

                  <button
                    disabled={busy}
                    onClick={closeFinance}
                    className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm disabled:opacity-50 text-emerald-800"
                  >
                    {t("tripFinance.actions.closeFinance")}
                  </button>

                  <button
                    disabled={busy}
                    onClick={load}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
                  >
                    {t("tripFinance.actions.refresh")}
                  </button>

                  <div className="text-xs text-slate-600">{t("tripFinance.actions.endpointsHint")}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}