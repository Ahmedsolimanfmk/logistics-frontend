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

type TabKey = "overview" | "expenses" | "actions";

export default function AdvanceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id || "");

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";
  const isSupervisor = role === "FIELD_SUPERVISOR";

  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [advance, setAdvance] = useState<any | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [a, ex] = await Promise.all([
        api.get(`/cash/cash-advances/${id}`),
        api.get(`/cash/cash-advances/${id}/expenses`).catch(() => []),
      ]);

      setAdvance(a as any);
      setExpenses((Array.isArray(ex) ? ex : []) as any[]);
    } catch (e: any) {
      setError(e.message || "Failed to load advance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // computed totals
  const totals = useMemo(() => {
    const approved = expenses
      .filter((x) => String(x.approval_status || "").toUpperCase() === "APPROVED")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const pending = expenses
      .filter((x) => String(x.approval_status || "").toUpperCase() === "PENDING")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const rejected = expenses
      .filter((x) => String(x.approval_status || "").toUpperCase() === "REJECTED")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const advanceAmount = Number(advance?.amount || 0);
    const remaining = advanceAmount - approved;

    return { approved, pending, rejected, advanceAmount, remaining };
  }, [expenses, advance?.amount]);

  // security: supervisor can only see his advance (soft check)
  useEffect(() => {
    if (!advance || !isSupervisor) return;
    if (advance.field_supervisor_id && advance.field_supervisor_id !== user?.id) {
      setError("Forbidden: this advance is not yours.");
    }
  }, [advance, isSupervisor, user?.id]);

  async function submitReview() {
    if (!isPrivileged) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/submit-review`, {});
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e.message || "Submit review failed");
    } finally {
      setBusy(false);
    }
  }

  async function closeAdvance() {
    if (!isPrivileged) return;
    const notes = window.prompt("ملاحظة/مرجع إغلاق (اختياري):") || "";
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/close`, {
        notes: notes.trim() || undefined,
      });
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e.message || "Close failed");
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    if (!isPrivileged) return;
    const notes = window.prompt("ملاحظة (اختياري):") || "";
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/reopen`, {
        notes: notes.trim() || undefined,
      });
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e.message || "Reopen failed");
    } finally {
      setBusy(false);
    }
  }

  const st = String(advance?.status || "").toUpperCase();
  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "expenses" as const, label: "Expenses" },
    { key: "actions" as const, label: "Actions" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Advance Details</h1>
            {advance?.status ? <StatusBadge s={advance.status} /> : null}
          </div>
          <div className="text-xs text-slate-400">
            ID: <span className="text-slate-200">{id}</span>
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
            href="/finance/advances"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            List
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
        ) : tab === "overview" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Advance Amount</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.advanceAmount)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Approved Used</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.approved)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Remaining</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.remaining)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Pending</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.pending)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Rejected</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.rejected)}</div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
              <div className="text-xs text-slate-400">Supervisor</div>
              <div className="text-sm text-slate-200">
                {advance?.users_cash_advances_supervisor?.full_name ||
                  advance?.users_cash_advances_supervisor?.email ||
                  advance?.field_supervisor_id ||
                  "—"}
              </div>

              <div className="mt-2 text-xs text-slate-400">Created At</div>
              <div className="text-sm text-slate-200">{fmtDate(advance?.created_at)}</div>

              <div className="mt-2 text-xs text-slate-400">Notes</div>
              <div className="text-sm text-slate-200 whitespace-pre-wrap">
                {advance?.notes || "—"}
              </div>
            </div>
          </div>
        ) : tab === "expenses" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">
                Expenses linked to this advance
              </div>
              <Link
                href="/finance/expenses/new"
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm"
              >
                New Expense
              </Link>
            </div>

            {expenses.length === 0 ? (
              <div className="text-sm text-slate-300">No expenses.</div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-3">Type</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-2">Created</div>
                  <div className="col-span-2 text-right">Link</div>
                </div>

                {expenses.map((x) => (
                  <div
                    key={x.id}
                    className="grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-white/10 hover:bg-white/5"
                  >
                    <div className="col-span-2 font-medium">{fmtMoney(x.amount)}</div>
                    <div className="col-span-3">{x.expense_type || "—"}</div>
                    <div className="col-span-3">
                      <span className="text-slate-200">{String(x.approval_status || "").toUpperCase()}</span>
                    </div>
                    <div className="col-span-2 text-slate-300">{fmtDate(x.created_at)}</div>
                    <div className="col-span-2 flex justify-end">
                      <Link
                        href={`/finance/expenses/${x.id}`}
                        className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Actions tab
          <div className="space-y-3">
            <div className="text-sm text-slate-200">
              Actions{" "}
              <span className="text-xs text-slate-400">
                (Role: {role || "—"} / Status: {st || "—"})
              </span>
            </div>

            {!isPrivileged ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                لا توجد إجراءات متاحة لهذا الدور.
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                {st === "OPEN" ? (
                  <button
                    disabled={busy}
                    onClick={submitReview}
                    className="px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-sm disabled:opacity-50"
                  >
                    Submit for Review (OPEN → IN_REVIEW)
                  </button>
                ) : null}

                {st !== "CLOSED" ? (
                  <button
                    disabled={busy}
                    onClick={closeAdvance}
                    className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm disabled:opacity-50"
                  >
                    Close Advance
                  </button>
                ) : null}

                {st === "CLOSED" ? (
                  <button
                    disabled={busy}
                    onClick={reopen}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/10 hover:bg-white/15 text-sm disabled:opacity-50"
                  >
                    Reopen (CLOSED → OPEN)
                  </button>
                ) : null}

                <button
                  disabled={busy}
                  onClick={loadAll}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            )}

            <div className="text-xs text-slate-400">
              Endpoints: submit-review / close / reopen. 
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
