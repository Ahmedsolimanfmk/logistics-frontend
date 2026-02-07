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
    st === "APPROVED" || st === "REAPPROVED"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
      : st === "REJECTED"
      ? "bg-red-500/15 text-red-200 border-red-500/20"
      : st === "APPEALED"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
      : "bg-slate-500/15 text-slate-200 border-white/10";
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>{st}</span>
  );
}

type TabKey = "overview" | "audit" | "actions";

export default function ExpenseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id || "");

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isAccountantOrAdmin = role === "ACCOUNTANT" || role === "ADMIN";
  const isSupervisor = role === "FIELD_SUPERVISOR";

  const [tab, setTab] = useState<TabKey>("overview");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expense data (we try to fetch it; fallback scan advances)
  const [expense, setExpense] = useState<any | null>(null);

  // Audit response: { expense_id, audits: [] }
  const [audits, setAudits] = useState<any[]>([]);
  const [auditNote, setAuditNote] = useState<string | null>(null);

  // ---------- loaders ----------
  async function fetchExpenseByBestEffort(expenseId: string) {
    // 1) if you later add GET /cash/cash-expenses/:id this will work automatically
    try {
      const e = await api.get(`/cash/cash-expenses/${expenseId}`);
      return e as any;
    } catch {
      // ignore
    }

    // 2) fallback: scan advances -> expenses (works for ADVANCE expenses)
    try {
      const advances = (await api.get("/cash/cash-advances")) as any[];

      const visibleAdvances = isSupervisor
        ? advances.filter((a) => a.field_supervisor_id === user?.id)
        : advances;

      // try in parallel (cap to avoid overloading)
      const lists = await Promise.all(
        visibleAdvances.slice(0, 60).map(async (a) => {
          try {
            const arr = (await api.get(`/cash/cash-advances/${a.id}/expenses`)) as any[];
            return arr;
          } catch {
            return [];
          }
        })
      );

      const flat = lists.flat();
      const found = flat.find((x) => x.id === expenseId);
      return found || null;
    } catch {
      return null;
    }
  }

  async function fetchAudit(expenseId: string) {
    try {
      const r: any = await api.get(`/cash/cash-expenses/${expenseId}/audit`);
      const arr = Array.isArray(r?.audits) ? r.audits : [];
      setAudits(arr);
      if (r?.note) setAuditNote(String(r.note));
      else setAuditNote(null);
    } catch (e: any) {
      // audit is optional (table may not exist)
      setAudits([]);
      setAuditNote(e?.message || "Failed to load audit");
    }
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [e] = await Promise.all([fetchExpenseByBestEffort(id)]);
      setExpense(e);

      await fetchAudit(id);
    } catch (e: any) {
      setError(e?.message || "Failed to load expense");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- derived permissions ----------
  const approvalStatus = String(expense?.approval_status || "").toUpperCase();
  const paymentSource = String(expense?.payment_source || "").toUpperCase();

  const canApproveReject = isAccountantOrAdmin && approvalStatus === "PENDING";
  const canReopenRejected = isAccountantOrAdmin && approvalStatus === "REJECTED";
  const canResolveAppeal = isAccountantOrAdmin && approvalStatus === "APPEALED";

  const isOwner = expense?.created_by && user?.id && expense.created_by === user.id;
  const canAppeal = isSupervisor && isOwner && approvalStatus === "REJECTED";

  // ---------- actions ----------
  async function approve() {
    if (!canApproveReject) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-expenses/${id}/approve`, {});
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e.message || "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!canApproveReject) return;
    const reason = window.prompt("سبب الرفض (مطلوب):");
    if (!reason || reason.trim().length < 2) return;

    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-expenses/${id}/reject`, { reason: reason.trim() });
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e.message || "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function appeal() {
    if (!canAppeal) return;
    const notes = window.prompt("سبب الاستئناف (مطلوب):");
    if (!notes || notes.trim().length < 2) return;

    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-expenses/${id}/appeal`, { notes: notes.trim() });
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e.message || "Appeal failed");
    } finally {
      setBusy(false);
    }
  }

  async function reopenRejected() {
    if (!canReopenRejected) return;
    const notes = window.prompt("ملاحظة (اختياري):") || "";

    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-expenses/${id}/reopen`, { notes: notes.trim() || undefined });
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e.message || "Reopen failed");
    } finally {
      setBusy(false);
    }
  }

  async function resolveAppeal(decision: "APPROVE" | "REJECT") {
    if (!canResolveAppeal) return;

    let payload: any = { decision };
    if (decision === "REJECT") {
      const reason = window.prompt("سبب الرفض (مطلوب):");
      if (!reason || reason.trim().length < 2) return;
      payload.reason = reason.trim();
    } else {
      const notes = window.prompt("ملاحظة (اختياري):");
      if (notes && notes.trim()) payload.notes = notes.trim();
    }

    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-expenses/${id}/resolve-appeal`, payload);
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e.message || "Resolve appeal failed");
    } finally {
      setBusy(false);
    }
  }

  // ---------- UI ----------
  const tabs = useMemo(
    () => [
      { key: "overview" as const, label: "Overview" },
      { key: "audit" as const, label: "Audit" },
      { key: "actions" as const, label: "Actions" },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Expense Details</h1>
            {expense?.approval_status ? <StatusBadge s={expense.approval_status} /> : null}
          </div>

          <div className="text-xs text-slate-400">
            ID: <span className="text-slate-200">{id}</span>
            {paymentSource ? (
              <>
                {" "}
                — Source: <span className="text-slate-200">{paymentSource}</span>
              </>
            ) : null}
          </div>

          {!loading && !expense ? (
            <div className="text-xs text-amber-300">
              لم يتم العثور على تفاصيل المصروف من قائمة العُهد. لو المصروف COMPANY، الأفضل إضافة endpoint
              GET /cash/cash-expenses/:id أو list endpoint.
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            Back
          </button>
          <Link
            href="/finance/expenses"
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

      {/* Tab content */}
      <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
        {loading ? (
          <div className="text-sm text-slate-300">Loading…</div>
        ) : tab === "overview" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Amount</div>
                <div className="text-lg font-semibold">{fmtMoney(expense?.amount)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Expense Type</div>
                <div className="text-sm text-slate-200">{expense?.expense_type || "—"}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Created At</div>
                <div className="text-sm text-slate-200">{fmtDate(expense?.created_at)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
                <div className="text-xs text-slate-400">Creator</div>
                <div className="text-sm text-slate-200">
                  {expense?.users_cash_expenses_created_byTousers?.full_name ||
                    expense?.users_cash_expenses_created_byTousers?.email ||
                    expense?.created_by ||
                    "—"}
                </div>
                <div className="text-xs text-slate-400 mt-2">Notes</div>
                <div className="text-sm text-slate-200 whitespace-pre-wrap">
                  {expense?.notes || "—"}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
                <div className="text-xs text-slate-400">Context</div>
                <div className="text-sm text-slate-200">
                  Trip: <span className="text-slate-300">{expense?.trip_id || "—"}</span>
                </div>
                <div className="text-sm text-slate-200">
                  Vehicle: <span className="text-slate-300">{expense?.vehicle_id || "—"}</span>
                </div>
                <div className="text-sm text-slate-200">
                  Work Order:{" "}
                  <span className="text-slate-300">{expense?.maintenance_work_order_id || "—"}</span>
                </div>

                {paymentSource === "COMPANY" ? (
                  <>
                    <div className="mt-2 text-xs text-slate-400">Company Fields</div>
                    <div className="text-sm text-slate-200">
                      Vendor: <span className="text-slate-300">{expense?.vendor_name || "—"}</span>
                    </div>
                    <div className="text-sm text-slate-200">
                      Invoice#: <span className="text-slate-300">{expense?.invoice_no || "—"}</span>
                    </div>
                    <div className="text-sm text-slate-200">
                      Invoice date:{" "}
                      <span className="text-slate-300">{fmtDate(expense?.invoice_date || null)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-2 text-xs text-slate-400">Advance</div>
                    <div className="text-sm text-slate-200">
                      Cash advance ID:{" "}
                      <span className="text-slate-300">{expense?.cash_advance_id || "—"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-slate-400">Resolution</div>
              <div className="text-sm text-slate-200">
                Approved at: <span className="text-slate-300">{fmtDate(expense?.approved_at || null)}</span>
              </div>
              <div className="text-sm text-slate-200">
                Rejected at: <span className="text-slate-300">{fmtDate(expense?.rejected_at || null)}</span>
              </div>
              <div className="text-sm text-slate-200">
                Resolved at: <span className="text-slate-300">{fmtDate(expense?.resolved_at || null)}</span>
              </div>
              {expense?.rejection_reason ? (
                <div className="text-sm text-red-200 mt-2">
                  Rejection reason: <span className="text-red-300">{expense.rejection_reason}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : tab === "audit" ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-200">
              Audit Timeline
              {auditNote ? <span className="ml-2 text-xs text-slate-400">({auditNote})</span> : null}
            </div>

            {audits.length === 0 ? (
              <div className="text-sm text-slate-300">No audit records.</div>
            ) : (
              <div className="space-y-2">
                {audits.map((a) => (
                  <div key={a.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-100">
                        {String(a.action || "ACTION")}
                      </div>
                      <div className="text-xs text-slate-400">{fmtDate(a.created_at)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Actor: <span className="text-slate-200">{a.actor_id || "—"}</span>
                    </div>

                    {a.notes ? (
                      <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">
                        {a.notes}
                      </div>
                    ) : null}

                    {(a.before || a.after) ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-slate-300 hover:text-white">
                          Show diff
                        </summary>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <pre className="text-xs overflow-auto rounded-lg border border-white/10 bg-slate-900 p-2">
                            {a.before || "—"}
                          </pre>
                          <pre className="text-xs overflow-auto rounded-lg border border-white/10 bg-slate-900 p-2">
                            {a.after || "—"}
                          </pre>
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // actions tab
          <div className="space-y-3">
            <div className="text-sm text-slate-200">
              Available Actions
              <span className="ml-2 text-xs text-slate-400">
                (Role: {role || "—"} / Status: {approvalStatus || "—"})
              </span>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              {canApproveReject ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={approve}
                    className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={reject}
                    className="px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-sm disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-300">
                  لا توجد إجراءات اعتماد/رفض متاحة الآن.
                </div>
              )}

              {canAppeal ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={appeal}
                    className="px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-sm disabled:opacity-50"
                  >
                    Appeal (Supervisor)
                  </button>
                </div>
              ) : null}

              {canResolveAppeal ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() => resolveAppeal("APPROVE")}
                    className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm disabled:opacity-50"
                  >
                    Resolve Appeal: Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => resolveAppeal("REJECT")}
                    className="px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-sm disabled:opacity-50"
                  >
                    Resolve Appeal: Reject
                  </button>
                </div>
              ) : null}

              {canReopenRejected ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={reopenRejected}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/10 hover:bg-white/15 text-sm disabled:opacity-50"
                  >
                    Reopen Rejected → PENDING
                  </button>
                </div>
              ) : null}
            </div>

            <div className="text-xs text-slate-400">
              ملاحظة: صفحة Actions مبنية على endpoints الموجودة عندك:
              approve / reject / appeal / resolve-appeal / reopen. 
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
