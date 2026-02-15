// app/(app)/finance/expenses/ExpensesClientPage.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
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

type TabKey = "PENDING" | "APPROVED" | "REJECTED" | "APPEALED" | "ALL";

export default function ExpensesClientPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);

  const role = roleUpper(user?.role);
  const canReview = role === "ADMIN" || role === "ACCOUNTANT";

  const status = (sp.get("status") || "PENDING").toUpperCase() as TabKey;
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 1),
    200
  );
  const q = sp.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    router.push(`/finance/expenses?${p.toString()}`);
  };

  const qsKey = useMemo(
    () => `${status}|${page}|${pageSize}|${q}`,
    [status, page, pageSize, q]
  );

  async function load() {
    if (token === null) return;
    if (!token) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await api.get("/cash/cash-expenses", {
        params: { status, page, page_size: pageSize, q: q || undefined },
      });

      const data = (res as any)?.data ?? res;

      const list = Array.isArray(data) ? data : (data as any)?.items || [];
      const tTotal = Array.isArray(data)
        ? list.length
        : Number((data as any)?.total || 0);

      setItems(list);
      setTotal(tTotal);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t("financeExpenses.errors.loadFailed");
      setErr(msg);
      setItems([]);
      setTotal(0);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qsKey, token]);

  async function approve(expenseId: string) {
    if (!canReview) return;
    const notes = window.prompt(t("financeExpenses.prompts.approveNotes")) || "";
    try {
      await api.post(`/cash/cash-expenses/${expenseId}/approve`, {
        notes: notes || null,
      });
      showToast("success", t("common.save"));
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message ||
          e?.message ||
          t("financeExpenses.errors.approveFailed")
      );
    }
  }

  async function reject(expenseId: string) {
    if (!canReview) return;
    const reason = window.prompt(t("financeExpenses.prompts.rejectReason"));
    if (!reason || reason.trim().length < 2) return;

    const notes = window.prompt(t("financeExpenses.prompts.rejectNotes")) || "";
    try {
      await api.post(`/cash/cash-expenses/${expenseId}/reject`, {
        reason: reason.trim(),
        notes: notes || null,
      });
      showToast("success", t("common.save"));
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message ||
          e?.message ||
          t("financeExpenses.errors.rejectFailed")
      );
    }
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "PENDING", label: t("financeExpenses.tabs.PENDING") },
    { key: "APPROVED", label: t("financeExpenses.tabs.APPROVED") },
    { key: "REJECTED", label: t("financeExpenses.tabs.REJECTED") },
    { key: "APPEALED", label: t("financeExpenses.tabs.APPEALED") },
    { key: "ALL", label: t("financeExpenses.tabs.ALL") },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("financeExpenses.title")}</div>
            <div className="text-xs text-slate-400">
              {t("common.role")}:{" "}
              <span className="text-slate-200">{role || "—"}</span>
              {!canReview ? (
                <span className="ml-2">({t("financeExpenses.viewOnly")})</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/finance"
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
            >
              ← {t("sidebar.finance")}
            </Link>
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm disabled:opacity-60"
            >
              {loading ? t("common.loading") : t("common.refresh")}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((x) => (
            <button
              key={x.key}
              onClick={() => setParam("status", x.key)}
              className={cn(
                "px-3 py-2 rounded-xl text-sm border transition",
                status === x.key
                  ? "bg-white/10 border-white/10 text-white"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              {x.label}
            </button>
          ))}
        </div>

        {/* Search + meta */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder={t("financeExpenses.filters.searchPlaceholder")}
            className="w-full md:w-[420px] px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm outline-none"
          />

          <div className="text-xs text-slate-400">
            {t("common.total")}: <span className="text-slate-200">{total}</span>{" "}
            — {t("common.page")}{" "}
            <span className="text-slate-200">
              {page}/{totalPages}
            </span>
          </div>

          <select
            value={String(pageSize)}
            onChange={(e) => setParam("pageSize", e.target.value)}
            className="ml-auto px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm outline-none"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            {err}
          </div>
        ) : null}

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {loading ? (
            <div className="p-4 text-sm text-slate-300">{t("common.loading")}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-slate-300">{t("financeExpenses.empty")}</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeExpenses.table.id")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeExpenses.table.amount")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeExpenses.table.type")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeExpenses.table.status")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeExpenses.table.trip")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeExpenses.table.vehicle")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeExpenses.table.created")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeExpenses.table.actions")}</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((x: any) => {
                    const st = String(x.approval_status || x.status || "").toUpperCase();
                    return (
                      <tr key={x.id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-2 font-mono">{shortId(x.id)}</td>
                        <td className="px-4 py-2 font-semibold">{fmtMoney(x.amount)}</td>
                        <td className="px-4 py-2">{x.expense_type || "—"}</td>
                        <td className="px-4 py-2">
                          <StatusBadge s={st} />
                        </td>
                        <td className="px-4 py-2 font-mono">{x.trip_id ? shortId(x.trip_id) : "—"}</td>
                        <td className="px-4 py-2">{x.vehicles?.plate_no || x.vehicles?.plate_number || "—"}</td>
                        <td className="px-4 py-2 text-slate-300">{fmtDate(x.created_at)}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/finance/expenses/${x.id}`}
                              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                            >
                              {t("common.view")}
                            </Link>

                            {canReview && st === "PENDING" ? (
                              <>
                                <button
                                  onClick={() => approve(x.id)}
                                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-emerald-600/70 hover:bg-emerald-600 text-xs"
                                >
                                  {t("financeExpenses.actions.approve")}
                                </button>
                                <button
                                  onClick={() => reject(x.id)}
                                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-red-600/70 hover:bg-red-600 text-xs"
                                >
                                  {t("financeExpenses.actions.reject")}
                                </button>
                              </>
                            ) : null}

                            {st === "REJECTED" && x.rejection_reason ? (
                              <span className="text-xs text-slate-400">
                                {t("financeExpenses.table.reason")}:{" "}
                                <span className="text-slate-200">{String(x.rejection_reason)}</span>
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 p-4 border-t border-white/10">
            <button
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              {t("common.prev")}
            </button>

            <div className="text-xs text-slate-400">
              {t("financeExpenses.meta.showing", { count: items.length, total })}
            </div>

            <button
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setParam("page", String(page + 1))}
            >
              {t("common.next")}
            </button>
          </div>
        </div>

        <Toast
          open={toastOpen}
          message={toastMsg}
          type={toastType}
          onClose={() => setToastOpen(false)}
        />
      </div>
    </div>
  );
}
