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
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(v);
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
      : st === "UNDER_REVIEW"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : st === "CLOSED"
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : "bg-white text-slate-700 border-slate-200";

  return <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>{st || "—"}</span>;
}

function ProfitBadge({ s }: { s?: string | null }) {
  const st = String(s || "").toUpperCase();

  const cls =
    st === "PROFIT"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : st === "LOSS"
      ? "bg-red-50 text-red-800 border-red-200"
      : st === "BREAK_EVEN"
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

  const canViewProfitability = role === "ADMIN" || role === "ACCOUNTANT";
  const canManageFinanceState = role === "ADMIN" || role === "ACCOUNTANT";
  const canEditRevenue = role === "ADMIN" || role === "CONTRACT_MANAGER";

  const [tab, setTab] = useState<TabKey>("summary");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<TripFinanceSummary | null>(null);
  const [revenueRecord, setRevenueRecord] = useState<TripRevenue | null>(null);

  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueCurrency, setRevenueCurrency] = useState("EGP");
  const [revenueSource, setRevenueSource] = useState<TripRevenueSource>("MANUAL");
  const [revenueNotes, setRevenueNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!canViewProfitability) {
      router.replace("/trips");
    }
  }, [user, canViewProfitability, router]);

  async function load() {
    if (!tripId || !canViewProfitability) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const financePromise = tripFinanceService.getSummary(tripId);
      const profitabilityPromise = tripRevenuesService.getProfitability(tripId);
      const revenuePromise = canEditRevenue
        ? tripRevenuesService.getByTrip(tripId)
        : Promise.resolve({ success: true, data: null } as any);

      const [financeSummary, revenueRes, profitabilityRes] = await Promise.all([
        financePromise,
        revenuePromise,
        profitabilityPromise,
      ]);

      const revenue = revenueRes?.data || null;
      const profitability = profitabilityRes?.data || null;

      const mergedSummary: TripFinanceSummary = {
        ...financeSummary,
        revenue: profitability?.revenue ?? financeSummary?.revenue ?? 0,
        expenses: profitability?.expenses ?? financeSummary?.expenses ?? 0,
        pending_expenses:
          profitability?.pending_expenses ?? financeSummary?.pending_expenses ?? 0,
        company_expenses:
          profitability?.company_expenses ?? financeSummary?.company_expenses ?? 0,
        advance_expenses:
          profitability?.advance_expenses ?? financeSummary?.advance_expenses ?? 0,
        profit: profitability?.profit ?? financeSummary?.profit ?? 0,
        profit_status:
          profitability?.profit_status ?? financeSummary?.profit_status ?? "BREAK_EVEN",
        currency:
          profitability?.currency ||
          financeSummary?.currency ||
          revenue?.currency ||
          "EGP",
        revenue_record:
          profitability?.revenue_record ?? financeSummary?.revenue_record ?? revenue ?? null,
        breakdown_by_type:
          profitability?.breakdown_by_type ?? financeSummary?.breakdown_by_type ?? {},
      };

      setSummary(mergedSummary);
      setRevenueRecord(revenue);

      setRevenueAmount(revenue?.amount != null ? String(num(revenue.amount)) : "");
      setRevenueCurrency(
        String(revenue?.currency || profitability?.currency || financeSummary?.currency || "EGP")
      );
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
    if (!tripId || !canViewProfitability) return;
    load();
  }, [tripId, canViewProfitability]);

  const financeStatus = useMemo(() => {
    return summary?.financial_status || "UNKNOWN";
  }, [summary]);

  const totals = useMemo(() => {
    const revenue = num(summary?.revenue);
    const totalExpenses = num(summary?.expenses);
    const pendingExpenses = num(summary?.pending_expenses);
    const advanceTotal = num(summary?.advance_expenses);
    const companyTotal = num(summary?.company_expenses);
    const profit = num(summary?.profit ?? revenue - totalExpenses);

    return {
      revenue,
      totalExpenses,
      pendingExpenses,
      advanceTotal,
      companyTotal,
      profit,
    };
  }, [summary]);

  const expensesBreakdownEntries = useMemo(() => {
    const obj = summary?.breakdown_by_type || {};
    return Object.entries(obj).sort((a, b) => num(b[1]) - num(a[1]));
  }, [summary]);

  async function openReview() {
    if (!canManageFinanceState) return;

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
    if (!canManageFinanceState) return;

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
      await tripRevenuesService.save(tripId, {
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

  const tabs = useMemo(() => {
    const baseTabs: { key: TabKey; label: string }[] = [
      { key: "summary", label: t("tripFinance.tabs.summary") },
      { key: "expenses", label: t("tripFinance.tabs.expenses") },
    ];

    if (canEditRevenue) {
      baseTabs.splice(1, 0, { key: "revenue", label: "الإيراد" });
    }

    if (canManageFinanceState) {
      baseTabs.push({ key: "actions", label: t("tripFinance.tabs.actions") });
    }

    return baseTabs;
  }, [t, canEditRevenue, canManageFinanceState]);

  useEffect(() => {
    if (tab === "revenue" && !canEditRevenue) {
      setTab("summary");
    }
    if (tab === "actions" && !canManageFinanceState) {
      setTab("summary");
    }
  }, [tab, canEditRevenue, canManageFinanceState]);

  const currency = summary?.currency || revenueRecord?.currency || revenueCurrency || "EGP";

  if (user && !canViewProfitability) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{t("tripFinance.title")}</h1>
              <StatusBadge s={String(financeStatus)} />
              <ProfitBadge s={summary?.profit_status} />
            </div>

            <div className="text-xs text-slate-600">
              {t("tripFinance.tripId")}:{" "}
              <span className="text-slate-900 font-semibold">{tripId}</span>
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
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الإيراد</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(totals.revenue, currency)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">المصروفات المعتمدة</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(totals.totalExpenses, currency)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">المصروفات المعلقة</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(totals.pendingExpenses, currency)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">مصروفات الشركة</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(totals.companyTotal, currency)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">مصروفات العهد</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(totals.advanceTotal, currency)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الربحية</div>
                  <div
                    className={cn(
                      "text-lg font-semibold",
                      totals.profit >= 0 ? "text-emerald-700" : "text-red-700"
                    )}
                  >
                    {fmtMoney(totals.profit, currency)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="text-sm font-semibold text-slate-900">معلومات الملف المالي</div>

                  <div className="text-sm text-slate-800">
                    الحالة المالية:{" "}
                    <span className="font-semibold text-slate-900">
                      {String(financeStatus || "—")}
                    </span>
                  </div>

                  <div className="text-sm text-slate-800">
                    العملة: <span className="font-semibold text-slate-900">{currency}</span>
                  </div>

                  <div className="text-sm text-slate-800">
                    حالة الربحية:{" "}
                    <span className="font-semibold text-slate-900">
                      {String(summary?.profit_status || "—")}
                    </span>
                  </div>

                  <div className="text-sm text-slate-800">
                    آخر إيراد مسجل:{" "}
                    <span className="font-semibold text-slate-900">
                      {summary?.revenue_record?.id
                        ? fmtMoney(summary?.revenue_record?.amount, currency)
                        : "—"}
                    </span>
                  </div>

                  <div className="text-sm text-slate-800">
                    تاريخ تسجيل الإيراد:{" "}
                    <span className="font-semibold text-slate-900">
                      {fmtDate(summary?.revenue_record?.entered_at || null)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-sm font-semibold text-slate-900 mb-3">
                    توزيع المصروفات حسب النوع
                  </div>

                  {expensesBreakdownEntries.length === 0 ? (
                    <div className="text-sm text-slate-600">لا توجد مصروفات معتمدة حتى الآن.</div>
                  ) : (
                    <div className="space-y-2">
                      {expensesBreakdownEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div className="text-slate-800">{key}</div>
                          <div className="font-semibold text-slate-900">
                            {fmtMoney(value, currency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : tab === "revenue" && canEditRevenue ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الإيراد الحالي</div>
                  <div className="text-lg font-semibold">{fmtMoney(totals.revenue, currency)}</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">آخر قيمة محفوظة</div>
                  <div className="text-lg font-semibold">
                    {revenueRecord?.amount != null ? fmtMoney(revenueRecord.amount, currency) : "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">مصدر الإيراد</div>
                  <div className="text-lg font-semibold">
                    {String(revenueRecord?.source || revenueSource || "MANUAL")}
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
                      المدخل:{" "}
                      <span className="font-semibold">
                        {revenueRecord?.users_entered?.full_name || "—"}
                      </span>
                    </div>
                    <div>
                      تاريخ الإدخال:{" "}
                      <span className="font-semibold">{fmtDate(revenueRecord?.entered_at)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                    <div>
                      الإيراد الحالي: <span className="font-semibold">{fmtMoney(totals.revenue, currency)}</span>
                    </div>
                    <div>
                      آخر قيمة محفوظة:{" "}
                      <span className="font-semibold">
                        {revenueRecord?.amount != null ? fmtMoney(revenueRecord.amount, currency) : "—"}
                      </span>
                    </div>
                    <div>
                      العملة: <span className="font-semibold">{currency}</span>
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
                <div className="text-sm text-slate-800">ملخص المصروفات</div>
                <Link href="/finance/expenses" className="text-xs text-slate-600 hover:text-slate-900">
                  فتح قائمة المصروفات
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">مصروفات الشركة</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(totals.companyTotal, currency)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">مصروفات العهد</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(totals.advanceTotal, currency)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">المصروفات المعلقة</div>
                  <div className="text-lg font-semibold">
                    {fmtMoney(totals.pendingExpenses, currency)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900 mb-3">التوزيع حسب النوع</div>

                {expensesBreakdownEntries.length === 0 ? (
                  <div className="text-sm text-slate-600">لا توجد مصروفات معتمدة متاحة للعرض.</div>
                ) : (
                  <div className="space-y-2">
                    {expensesBreakdownEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div className="text-slate-800">{key}</div>
                        <div className="font-semibold text-slate-900">
                          {fmtMoney(value, currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : tab === "actions" && canManageFinanceState ? (
            <div className="space-y-3">
              <div className="text-sm text-slate-800">
                {t("tripFinance.actions.title")}{" "}
                <span className="text-xs text-slate-600">
                  (Role: {role || "—"} / Finance: {String(financeStatus).toUpperCase()})
                </span>
              </div>

              {!canManageFinanceState ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {t("tripFinance.actions.noPerm")}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                  <button
                    disabled={busy || String(financeStatus).toUpperCase() === "UNDER_REVIEW"}
                    onClick={openReview}
                    className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-sm disabled:opacity-50 text-amber-800"
                  >
                    {t("tripFinance.actions.openReview")}
                  </button>

                  <button
                    disabled={busy || String(financeStatus).toUpperCase() === "CLOSED"}
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

                  <div className="text-xs text-slate-600">
                    يمكن فتح المراجعة المالية ثم إغلاقها بعد اكتمال مراجعة الربحية والمصروفات.
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}