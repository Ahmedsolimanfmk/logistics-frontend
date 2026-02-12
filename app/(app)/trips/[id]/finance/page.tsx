"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT"; // ✅ عدّل المسار لو مختلف عندك

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

type TabKey = "summary" | "expenses" | "actions";

function StatusBadge({ s }: { s: string }) {
  const st = String(s || "").toUpperCase();
  const cls =
    st === "OPEN"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
      : st === "IN_REVIEW"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
      : st === "CLOSED"
      ? "bg-slate-500/15 text-slate-200 border-white/10"
      : "bg-white/5 text-slate-200 border-white/10";
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>
      {st || "—"}
    </span>
  );
}

export default function TripFinancePage() {
  const t = useT();

  const params = useParams();
  const router = useRouter();
  const tripId = String((params as any)?.id || "");

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);
  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";

  const [tab, setTab] = useState<TabKey>("summary");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend summary shape may vary; keep it loose
  const [summary, setSummary] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/cash/trips/${tripId}/finance/summary`);
      setSummary(res.data ?? res);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          t("tripFinance.errors.loadFailed")
      );
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tripId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      Number(
        summary?.totals?.expenses_total ??
          summary?.expenses_total ??
          summary?.total_expenses ??
          0
      ) || 0;

    const advanceTotal =
      Number(
        summary?.totals?.advances_total ??
          summary?.advances_total ??
          summary?.total_advances ??
          0
      ) || 0;

    const companyTotal =
      Number(
        summary?.totals?.company_total ??
          summary?.company_total ??
          summary?.total_company ??
          0
      ) || 0;

    const partsTotal =
      Number(
        summary?.totals?.parts_cost ??
          summary?.parts_cost ??
          summary?.total_parts_cost ??
          0
      ) || 0;

    const maintenanceTotal =
      Number(
        summary?.totals?.maintenance_total ?? summary?.maintenance_total ?? 0
      ) || 0;

    const balanceRaw = summary?.totals?.balance ?? summary?.balance;
    const balance = Number(balanceRaw ?? advanceTotal - totalExpenses) || 0;

    return {
      totalExpenses,
      advanceTotal,
      companyTotal,
      partsTotal,
      maintenanceTotal,
      balance,
    };
  }, [summary]);

  const expenses: any[] = useMemo(() => {
    const arr = summary?.expenses || summary?.items || summary?.details?.expenses || [];
    return Array.isArray(arr) ? arr : [];
  }, [summary]);

  const advances: any[] = useMemo(() => {
    const arr =
      summary?.advances ||
      summary?.cash_advances ||
      summary?.details?.advances ||
      [];
    return Array.isArray(arr) ? arr : [];
  }, [summary]);

  async function openReview() {
    if (!isPrivileged) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/trips/${tripId}/finance/open-review`, {});
      await load();
      setTab("summary");
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          t("tripFinance.errors.openReviewFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  async function closeFinance() {
    if (!isPrivileged) return;

    const confirmText = t("tripFinance.confirm.closeText");
    if (!window.confirm(confirmText)) return;

    const notes =
      window.prompt(t("tripFinance.confirm.closeNotesPrompt")) || "";

    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/trips/${tripId}/finance/close`, {
        notes: notes.trim() || undefined,
      });
      await load();
      setTab("summary");
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          t("tripFinance.errors.closeFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    { key: "summary" as const, label: t("tripFinance.tabs.summary") },
    { key: "expenses" as const, label: t("tripFinance.tabs.expenses") },
    { key: "actions" as const, label: t("tripFinance.tabs.actions") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("tripFinance.title")}</h1>
            <StatusBadge s={financeStatus} />
          </div>
          <div className="text-xs text-slate-400">
            {t("tripFinance.tripId")}:{" "}
            <span className="text-slate-200">{tripId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {t("common.back")}
          </button>

          <Link
            href="/trips"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {t("tripFinance.trips")}
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

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

      <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
        {loading ? (
          <div className="text-sm text-slate-300">{t("common.loading")}</div>
        ) : tab === "summary" ? (
          <div className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">
                  {t("tripFinance.kpis.totalExpenses")}
                </div>
                <div className="text-lg font-semibold">
                  {fmtMoney(totals.totalExpenses)}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">
                  {t("tripFinance.kpis.advancesTotal")}
                </div>
                <div className="text-lg font-semibold">
                  {fmtMoney(totals.advanceTotal)}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">
                  {t("tripFinance.kpis.companyTotal")}
                </div>
                <div className="text-lg font-semibold">
                  {fmtMoney(totals.companyTotal)}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">
                  {t("tripFinance.kpis.partsCost")}
                </div>
                <div className="text-lg font-semibold">
                  {fmtMoney(totals.partsTotal)}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">
                  {t("tripFinance.kpis.balance")}
                </div>
                <div className="text-lg font-semibold">
                  {fmtMoney(totals.balance)}
                </div>
              </div>
            </div>

            {/* meta */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
              <div className="text-xs text-slate-400">
                {t("tripFinance.tripInfo.title")}
              </div>

              <div className="text-sm text-slate-200">
                {t("tripFinance.tripInfo.code")}:{" "}
                <span className="text-slate-300">{summary?.trip?.code || "—"}</span>
              </div>

              <div className="text-sm text-slate-200">
                {t("tripFinance.tripInfo.status")}:{" "}
                <span className="text-slate-300">
                  {String(summary?.trip?.status || "—")}
                </span>
              </div>

              <div className="text-sm text-slate-200">
                {t("tripFinance.tripInfo.financeClosedAt")}:{" "}
                <span className="text-slate-300">
                  {fmtDate(
                    summary?.trip?.financial_closed_at ||
                      summary?.trip?.finance_closed_at ||
                      null
                  )}
                </span>
              </div>

              {summary?.note ? (
                <div className="mt-2 text-xs text-slate-400">
                  {t("tripFinance.tripInfo.note")}:{" "}
                  <span className="text-slate-200">{String(summary.note)}</span>
                </div>
              ) : null}
            </div>

            {/* Advances */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-200">
                  {t("tripFinance.linkedAdvances.title")}
                </div>
                <Link
                  href="/finance/advances"
                  className="text-xs text-slate-300 hover:text-white"
                >
                  {t("tripFinance.linkedAdvances.openList")}
                </Link>
              </div>

              {advances.length === 0 ? (
                <div className="mt-2 text-sm text-slate-300">
                  {t("tripFinance.linkedAdvances.empty")}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {advances.slice(0, 6).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="text-slate-200">
                        {String(a.id).slice(0, 8)}… —{" "}
                        {String(a.status || "").toUpperCase()}
                      </div>
                      <div className="text-slate-300">{fmtMoney(a.amount)}</div>
                    </div>
                  ))}
                  {advances.length > 6 ? (
                    <div className="text-xs text-slate-400">
                      +{advances.length - 6} more…
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : tab === "expenses" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">
                {t("tripFinance.expensesTable.title")}
              </div>
              <Link
                href="/finance/expenses"
                className="text-xs text-slate-300 hover:text-white"
              >
                {t("tripFinance.expensesTable.openList")}
              </Link>
            </div>

            {expenses.length === 0 ? (
              <div className="text-sm text-slate-300">
                {t("tripFinance.expensesTable.empty")}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
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
                    className="grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-white/10 hover:bg-white/5"
                  >
                    <div className="col-span-2 font-medium">{fmtMoney(x.amount)}</div>
                    <div className="col-span-3">{x.expense_type || "—"}</div>
                    <div className="col-span-2 text-slate-200">
                      {String(x.payment_source || "").toUpperCase() || "—"}
                    </div>
                    <div className="col-span-2 text-slate-200">
                      {String(x.approval_status || "").toUpperCase() || "—"}
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
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-slate-200">
              {t("tripFinance.actions.title")}{" "}
              <span className="text-xs text-slate-400">
                (Role: {role || "—"} / Finance:{" "}
                {String(financeStatus).toUpperCase()})
              </span>
            </div>

            {!isPrivileged ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                {t("tripFinance.actions.noPerm")}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                <button
                  disabled={busy}
                  onClick={openReview}
                  className="px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-sm disabled:opacity-50"
                >
                  {t("tripFinance.actions.openReview")}
                </button>

                <button
                  disabled={busy}
                  onClick={closeFinance}
                  className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm disabled:opacity-50"
                >
                  {t("tripFinance.actions.closeFinance")}
                </button>

                <button
                  disabled={busy}
                  onClick={load}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
                >
                  {t("tripFinance.actions.refresh")}
                </button>

                <div className="text-xs text-slate-400">
                  {t("tripFinance.actions.endpointsHint")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
