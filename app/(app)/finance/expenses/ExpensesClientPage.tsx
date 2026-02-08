"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function StatusBadge({ s }: { s: string }) {
  const st = String(s || "").toUpperCase();
  const cls =
    st === "APPROVED" || st === "REAPPROVED"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
      : st === "REJECTED"
      ? "bg-red-500/15 text-red-200 border-red-500/20"
      : st === "APPEALED"
      ? "bg-indigo-500/15 text-indigo-200 border-indigo-500/20"
      : st === "PENDING"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
      : "bg-white/5 text-slate-200 border-white/10";

  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>
      {st || "—"}
    </span>
  );
}

type ExpenseRow = {
  id: string;
  status?: string | null;
  amount?: number | string | null;
  vendor_name?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export default function ExpensesClientPage() {
  const [items, setItems] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = useMemo(() => items.length, [items]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // حاول endpoint شائع: /finance/expenses
      const res = await api.get("/finance/expenses");
      const d = res?.data;

      const arr: ExpenseRow[] = Array.isArray(d)
        ? d
        : Array.isArray(d?.items)
        ? d.items
        : Array.isArray(d?.data?.items)
        ? d.data.items
        : [];

      setItems(arr);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load expenses");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-bold">Expenses</div>
          <div className="text-sm text-white/60">Total: {total}</div>
        </div>

        <button
          onClick={load}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 p-3 text-sm">
          ⚠️ {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Vendor</th>
                <th className="text-left px-4 py-3">Note</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-white/60" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-white/60" colSpan={6}>
                    No expenses found.
                  </td>
                </tr>
              ) : (
                items.map((x) => (
                  <tr key={x.id} className="border-t border-white/10">
                    <td className="px-4 py-3 text-white/80">{shortId(x.id)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge s={String(x.status || "—")} />
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {x.amount ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {x.vendor_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {x.note || "—"}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {fmtDate(x.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
