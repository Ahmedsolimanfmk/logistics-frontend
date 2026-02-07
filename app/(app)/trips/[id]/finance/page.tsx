"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

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
      const r = await api.get(`/cash/trips/${tripId}/finance/summary`);
      setSummary(r as any);
    } catch (e: any) {
      setError(e.message || "Failed to load trip finance summary");
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
    // try common field names
    return (
      summary?.finance_status ||
      summary?.financial_status ||
      summary?.trip?.finance_status ||
      summary?.trip?.financial_status ||
      "UNKNOWN"
    );
  }, [summary]);

  const totals = useMemo(() => {
    // Try to read totals in a tolerant way
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

    const balanceRaw =
  summary?.totals?.balance ?? summary?.balance;

    const balance =
    Number(balanceRaw ?? (advanceTotal - totalExpenses)) || 0;


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
    const arr =
      summary?.expenses ||
      summary?.items ||
      summary?.details?.expenses ||
      [];
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
      setError(e.message || "Failed to open finance review");
    } finally {
      setBusy(false);
    }
  }

  async function closeFinance() {
    if (!isPrivileged) return;

    const confirmText =
      "سيتم إغلاق الرحلة ماليًا (Lock). هل أنت متأكد؟";
    if (!window.confirm(confirmText)) return;

    const notes = window.prompt("ملاحظة/مرجع الإغلاق (اختياري):") || "";

    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/trips/${tripId}/finance/close`, {
        notes: notes.trim() || undefined,
      });
      await load();
      setTab("summary");
    } catch (e: any) {
      setError(e.message || "Failed to close trip finance");
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    { key: "summary" as const, label: "Summary" },
    { key: "expenses" as const, label: "Expenses" },
    { key: "actions" as const, label: "Actions" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Trip Finance</h1>
            <StatusBadge s={financeStatus} />
          </div>
          <div className="text-xs text-slate-400">
            Trip ID: <span className="text-slate-200">{tripId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            Back
          </button>

          <Link
            href="/trips"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            Trips
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
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm border transition",
              tab === t.key
                ? "bg-white/10 border-white/10 text-white"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
        {loading ? (
          <div className="text-sm text-slate-300">Loading…</div>
        ) : tab === "summary" ? (
          <div className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Total Expenses</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.totalExpenses)}</div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Advances Total</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.advanceTotal)}</div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Company Total</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.companyTotal)}</div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Parts Cost</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.partsTotal)}</div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Balance</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.balance)}</div>
              </div>
            </div>

            {/* meta (tolerant) */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
              <div className="text-xs text-slate-400">Trip Info</div>
              <div className="text-sm text-slate-200">
                Code: <span className="text-slate-300">{summary?.trip?.code || "—"}</span>
              </div>
              <div className="text-sm text-slate-200">
                Status: <span className="text-slate-300">{String(summary?.trip?.status || "—")}</span>
              </div>
              <div className="text-sm text-slate-200">
                Finance closed at:{" "}
                <span className="text-slate-300">
                  {fmtDate(summary?.trip?.financial_closed_at || summary?.trip?.finance_closed_at || null)}
                </span>
              </div>

              {summary?.note ? (
                <div className="mt-2 text-xs text-slate-400">
                  Note: <span className="text-slate-200">{String(summary.note)}</span>
                </div>
              ) : null}
            </div>

            {/* Advances quick */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-200">Linked Advances</div>
                <Link
                  href="/finance/advances"
                  className="text-xs text-slate-300 hover:text-white"
                >
                  Open advances list →
                </Link>
              </div>

              {advances.length === 0 ? (
                <div className="mt-2 text-sm text-slate-300">No advances linked.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {advances.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <div className="text-slate-200">
                        {String(a.id).slice(0, 8)}… — {String(a.status || "").toUpperCase()}
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
              <div className="text-sm text-slate-200">Trip Expenses</div>
              <Link
                href="/finance/expenses"
                className="text-xs text-slate-300 hover:text-white"
              >
                Expenses list →
              </Link>
            </div>

            {expenses.length === 0 ? (
              <div className="text-sm text-slate-300">No expenses found in summary.</div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-3">Type</div>
                  <div className="col-span-2">Source</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Created</div>
                  <div className="col-span-1 text-right">View</div>
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
              Actions{" "}
              <span className="text-xs text-slate-400">
                (Role: {role || "—"} / Finance: {String(financeStatus).toUpperCase()})
              </span>
            </div>

            {!isPrivileged ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                لا توجد صلاحيات لإدارة إغلاق الرحلة ماليًا.
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                <button
                  disabled={busy}
                  onClick={openReview}
                  className="px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-sm disabled:opacity-50"
                >
                  Open Finance Review
                </button>

                <button
                  disabled={busy}
                  onClick={closeFinance}
                  className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm disabled:opacity-50"
                >
                  Close Trip Finance (Lock)
                </button>

                <button
                  disabled={busy}
                  onClick={load}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
                >
                  Refresh
                </button>

                <div className="text-xs text-slate-400">
                  Endpoints used: open-review / close / summary. 
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
