"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export default function AdvancesPage() {
  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";
  const isSupervisor = role === "FIELD_SUPERVISOR";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [items, setItems] = useState<any[]>([]);

  // filters
  const [status, setStatus] = useState<string>("ALL");
  const [q, setQ] = useState<string>("");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const list = (await api.get("/cash/cash-advances")) as any[];

      const visible = isSupervisor
        ? list.filter((a) => a.field_supervisor_id === user?.id)
        : list;

      setItems(Array.isArray(visible) ? visible : []);
    } catch (e: any) {
      setError(e.message || "Failed to load advances");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((a) => {
      const stOk =
        status === "ALL" ? true : String(a.status || "").toUpperCase() === status;

      const hay = [
        a.id,
        a.status,
        a.field_supervisor_id,
        a.issued_by,
        a.amount,
        a?.users_cash_advances_supervisor?.full_name,
        a?.users_cash_advances_supervisor?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const qOk = !qq ? true : hay.includes(qq);
      return stOk && qOk;
    });
  }, [items, status, q]);

  async function submitReview(id: string) {
    if (!isPrivileged) return;
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/submit-review`, {});
      await load();
    } catch (e: any) {
      setError(e.message || "Submit review failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reopen(id: string) {
    if (!isPrivileged) return;
    const notes = window.prompt("ملاحظة (اختياري):") || "";
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/reopen`, {
        notes: notes.trim() || undefined,
      });
      await load();
    } catch (e: any) {
      setError(e.message || "Reopen failed");
    } finally {
      setBusyId(null);
    }
  }

  async function closeAdvance(id: string) {
    if (!isPrivileged) return;
    const notes = window.prompt("ملاحظة/مرجع إغلاق (اختياري):") || "";
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/close`, {
        notes: notes.trim() || undefined,
      });
      await load();
    } catch (e: any) {
      setError(e.message || "Close failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Cash Advances</h1>
          <div className="text-xs text-slate-400">
            {isSupervisor
              ? "Showing only your advances."
              : "Showing all advances (admin/accountant)."}
          </div>
        </div>

        {/* لو عندك صفحة create advance بعدين هنضيفها */}
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-[260px] rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm"
          placeholder="Search… (id / supervisor / amount)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
          <div className="col-span-3">Supervisor</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-300">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-slate-300">No advances found.</div>
        ) : (
          filtered.map((a) => {
            const st = String(a.status || "").toUpperCase();
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
                <div className="col-span-3">{sup}</div>
                <div className="col-span-2 font-medium">{fmtMoney(a.amount)}</div>
                <div className="col-span-2">
                  <StatusBadge s={a.status} />
                </div>
                <div className="col-span-3 text-slate-300">{fmtDate(a.created_at)}</div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Link
                    href={`/finance/advances/${a.id}`}
                    className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                  >
                    View
                  </Link>

                  {isPrivileged && st === "OPEN" && (
                    <button
                      disabled={busyId === a.id}
                      onClick={() => submitReview(a.id)}
                      className="px-2 py-1 rounded-md border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-xs disabled:opacity-50"
                    >
                      Submit
                    </button>
                  )}

                  {isPrivileged && st !== "CLOSED" && (
                    <button
                      disabled={busyId === a.id}
                      onClick={() => closeAdvance(a.id)}
                      className="px-2 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs disabled:opacity-50"
                    >
                      Close
                    </button>
                  )}

                  {isPrivileged && st === "CLOSED" && (
                    <button
                      disabled={busyId === a.id}
                      onClick={() => reopen(a.id)}
                      className="px-2 py-1 rounded-md border border-white/10 bg-white/10 hover:bg-white/15 text-xs disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
