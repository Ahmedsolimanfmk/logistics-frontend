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
    st === "SETTLED" || st === "CLOSED"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
      : st === "OPEN" || st === "PENDING"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
      : st === "REJECTED" || st === "CANCELED"
      ? "bg-red-500/15 text-red-200 border-red-500/20"
      : "bg-white/5 text-slate-200 border-white/10";

  return <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>{st || "—"}</span>;
}

type TabKey = "ALL" | "OPEN" | "PENDING" | "SETTLED" | "CLOSED" | "REJECTED" | "CANCELED";

export default function AdvancesClientPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);

  const role = roleUpper(user?.role);
  const canSeeAll = role === "ADMIN" || role === "ACCOUNTANT";

  // query state
  const status = (sp.get("status") || "ALL").toUpperCase() as TabKey;
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 1), 200);
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
    router.push(`/finance/advances?${p.toString()}`);
  };

  const qsKey = useMemo(() => `${status}|${page}|${pageSize}|${q}`, [status, page, pageSize, q]);

  async function load() {
    if (token === null) return;
    if (!token) return;

    setLoading(true);
    setErr(null);

    try {
      // NOTE: endpoint name depends on backend.
      // If your backend uses /cash/cash-advances keep it.
      // If it is different, just change this path.
      const data = await api.get("/cash/cash-advances", {
        params: {
          status: status === "ALL" ? undefined : status,
          page,
          page_size: pageSize,
          q: q || undefined,
        },
      });

      const list = Array.isArray(data) ? data : (data as any)?.items || [];
      const tTotal = Array.isArray(data) ? list.length : Number((data as any)?.total || 0);

      setItems(list);
      setTotal(tTotal);
    } catch (e: any) {
      setErr(e?.message || t("financeAdvances.errors.loadFailed"));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qsKey, token]);

  const statusOptions: Array<{ key: TabKey; label: string }> = [
    { key: "ALL", label: t("financeAdvances.filters.allStatuses") },
    { key: "OPEN", label: t("financeAdvances.filters.status.OPEN") },
    { key: "PENDING", label: t("financeAdvances.filters.status.PENDING") },
    { key: "SETTLED", label: t("financeAdvances.filters.status.SETTLED") },
    { key: "CLOSED", label: t("financeAdvances.filters.status.CLOSED") },
    { key: "REJECTED", label: t("financeAdvances.filters.status.REJECTED") },
    { key: "CANCELED", label: t("financeAdvances.filters.status.CANCELED") },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("financeAdvances.title")}</div>
            <div className="text-xs text-slate-400">
              {canSeeAll ? t("financeAdvances.subtitleAdmin") : t("financeAdvances.subtitle")}
              <span className="mx-2">•</span>
              {t("common.role")}: <span className="text-slate-200">{role || "—"}</span>
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setParam("status", e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm outline-none"
          >
            {statusOptions.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder={t("financeAdvances.filters.searchPlaceholder")}
            className="w-full md:w-[420px] px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm outline-none"
          />

          <div className="ml-auto text-xs text-slate-400">
            {t("common.total")}: <span className="text-slate-200">{total}</span> — {t("common.page")}{" "}
            <span className="text-slate-200">
              {page}/{totalPages}
            </span>
          </div>

          <select
            value={String(pageSize)}
            onChange={(e) => setParam("pageSize", e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm outline-none"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">{err}</div>
        ) : null}

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {loading ? (
            <div className="p-4 text-sm text-slate-300">{t("common.loading")}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-slate-300">{t("financeAdvances.empty")}</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeAdvances.table.actions")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeAdvances.table.created")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeAdvances.table.status")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeAdvances.table.amount")}</th>
                    <th className="px-4 py-2 text-left text-slate-200">{t("financeAdvances.table.supervisor")}</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((x: any) => {
                    const st = String(x.status || x.advance_status || "").toUpperCase();
                    const supervisorName =
                      x.supervisors?.full_name ||
                      x.supervisor?.full_name ||
                      x.supervisor_name ||
                      x.supervisor_email ||
                      "—";

                    return (
                      <tr key={x.id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/finance/advances/${x.id}`}
                              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                            >
                              {t("common.view")}
                            </Link>
                            <span className="text-xs font-mono text-slate-400">{shortId(x.id)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-2 text-slate-300">{fmtDate(x.created_at)}</td>

                        <td className="px-4 py-2">
                          <StatusBadge s={st} />
                        </td>

                        <td className="px-4 py-2 font-semibold">{fmtMoney(x.amount)}</td>

                        <td className="px-4 py-2">{String(supervisorName)}</td>
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

            <div className="text-xs text-slate-400">{t("financeAdvances.meta.showing", { count: items.length, total })}</div>

            <button
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setParam("page", String(page + 1))}
            >
              {t("common.next")}
            </button>
          </div>
        </div>

        <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
      </div>
    </div>
  );
}
