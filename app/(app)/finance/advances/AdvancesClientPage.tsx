"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";

import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

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

type TabKey = "ALL" | "OPEN" | "SETTLED" | "CANCELED";

type AdvanceRow = {
  id: string;
  amount?: number;
  status?: string;
  created_at?: string | null;
  field_supervisor_id?: string | null;
  notes?: string | null;
  users_cash_advances_supervisor?: { full_name?: string | null; email?: string | null } | null;
};

/* =========================
   Issue Advance Modal (Light + RTL)
========================= */
function IssueAdvanceModal({
  open,
  onClose,
  onIssued,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  onIssued: () => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [supervisorId, setSupervisorId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!open) return;

    setSupervisorId("");
    setAmount("");

    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/users");
        const body = (res as any)?.data ?? res;
        const list = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];

        const sup = list.filter(
          (u: any) =>
            String(u?.role || "").toUpperCase() === "FIELD_SUPERVISOR" && u?.is_active !== false
        );

        setSupervisors(sup);
      } catch (e: any) {
        showToast("error", e?.response?.data?.message || e?.message || "Failed to load supervisors");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, showToast]);

  if (!open) return null;

  const canSubmit = !!supervisorId && Number(amount) > 0;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.post("/cash/cash-advances", {
        field_supervisor_id: supervisorId,
        amount: Number(amount),
      });

      showToast("success", t("financeAdvances.toast.issued"));
      onIssued();
      onClose();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || t("financeAdvances.errors.issueFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4"
      dir="rtl"
      onMouseDown={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white text-gray-900 border border-gray-200 shadow-xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t("financeAdvances.modal.issueTitle")}</h3>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            ✕
          </Button>
        </div>

        <div className="p-4 grid gap-3">
          <label className="grid gap-2 text-sm">
            <span className="text-xs text-gray-600">{t("financeAdvances.modal.supervisor")}</span>
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="">{t("financeAdvances.modal.selectSupervisor")}</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email || shortId(s.id)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-xs text-gray-600">{t("financeAdvances.modal.amount")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              placeholder={t("financeAdvances.modal.amountPh")}
              className="px-3 py-2 rounded-xl bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-gray-200"
            />
          </label>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2 justify-start">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>

          <Button variant="primary" onClick={submit} disabled={!canSubmit || loading} isLoading={loading}>
            {loading ? t("common.saving") : t("financeAdvances.actions.issue")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   MAIN PAGE
========================= */
export default function AdvancesClientPage(): React.ReactElement {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);

  const role = roleUpper(user?.role);
  const canSeeAll = role === "ADMIN" || role === "ACCOUNTANT";
  const canIssue = canSeeAll;

  const status = (sp.get("status") || "ALL").toUpperCase() as TabKey;
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 1), 200);
  const q = sp.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<AdvanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);

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

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  async function load() {
    if (!token) return;

    setLoading(true);
    setErr(null);

    try {
      const [listRes, summaryRes] = await Promise.all([
        api.get("/cash/cash-advances", {
          params: {
            status: status === "ALL" ? undefined : status,
            page,
            page_size: pageSize,
            q: q || undefined,
          },
        }),
        api.get("/cash/cash-advances/summary", {
          params: {
            status: status === "ALL" ? undefined : status,
            q: q || undefined,
          },
        }),
      ]);

      const data = (listRes as any)?.data ?? listRes;
      const list: AdvanceRow[] = Array.isArray(data) ? data : (data as any)?.items || [];
      const tTotal = Array.isArray(data) ? list.length : Number((data as any)?.total || 0);

      setItems(list);
      setTotal(tTotal);

      const sumData = (summaryRes as any)?.data ?? summaryRes;
      setSummary(sumData?.totals || null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t("financeAdvances.errors.loadFailed");
      setErr(msg);
      setItems([]);
      setTotal(0);
      setSummary(null);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, pageSize, q, token]);

  const kpi = useMemo(() => {
    if (summary) {
      return {
        sumAmount: Number(summary.sumAmount || 0),
        openCount: Number(summary.openCount || 0),
        settledCount: Number(summary.settledCount || 0),
        canceledCount: Number(summary.canceledCount || 0),
      };
    }

    const rows = items;
    const sumAmount = rows.reduce((acc, x) => acc + Number(x?.amount || 0), 0);

    return {
      sumAmount,
      openCount: rows.filter((x) =>
        ["OPEN", "IN_REVIEW", "PENDING"].includes(String(x.status).toUpperCase())
      ).length,
      settledCount: rows.filter((x) => ["SETTLED", "CLOSED"].includes(String(x.status).toUpperCase())).length,
      canceledCount: rows.filter((x) => ["CANCELED", "REJECTED"].includes(String(x.status).toUpperCase())).length,
    };
  }, [items, summary]);

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "ALL", label: t("common.all") || "الكل" },
    { key: "OPEN", label: t("financeAdvances.tabs.open") || "مفتوح", count: kpi.openCount },
    { key: "SETTLED", label: t("financeAdvances.tabs.settled") || "مُسوّى", count: kpi.settledCount },
    { key: "CANCELED", label: t("financeAdvances.tabs.canceled") || "ملغي", count: kpi.canceledCount },
  ];

  const columns: DataTableColumn<AdvanceRow>[] = [
    {
      key: "id",
      label: t("financeAdvances.table.id") || "المعرف",
      render: (r) => <span className="font-mono text-xs">{shortId(r.id)}</span>,
    },
    {
      key: "supervisor",
      label: t("financeAdvances.table.supervisor") || "المشرف",
      render: (r) =>
        r.users_cash_advances_supervisor?.full_name ||
        r.users_cash_advances_supervisor?.email ||
        r.field_supervisor_id ||
        "—",
    },
    {
      key: "amount",
      label: t("financeAdvances.table.amount") || "المبلغ",
      render: (r) => <span className="font-semibold">{fmtMoney(r.amount)}</span>,
    },
    {
      key: "status",
      label: t("financeAdvances.table.status") || "الحالة",
      render: (r) => <StatusBadge status={String(r.status || "").toUpperCase()} />,
    },
    {
      key: "created_at",
      label: t("financeAdvances.table.createdAt") || "تاريخ الإنشاء",
      render: (r) => fmtDate(r.created_at),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title={t("financeAdvances.title")}
          subtitle={
            <>
              {canSeeAll ? t("financeAdvances.meta.showingAll") : t("financeAdvances.meta.showingMine")}
              {" — "}
              {t("common.role")}: <span className="text-gray-700">{role || "—"}</span>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/finance">
                <Button variant="secondary">{t("sidebar.finance")}</Button>
              </Link>

              {canIssue ? (
                <Button variant="primary" onClick={() => setIssueOpen(true)}>
                  + {t("financeAdvances.actions.issue")}
                </Button>
              ) : null}

              <Button variant="secondary" onClick={load} disabled={loading} isLoading={loading}>
                {loading ? t("common.loading") : t("common.refresh")}
              </Button>
            </div>
          }
        />

        {/* KPI */}
        {!loading && !err ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label={t("financeAdvances.kpi.totalAmount")} value={fmtMoney(kpi.sumAmount)} />
            <KpiCard label={t("financeAdvances.kpi.open")} value={kpi.openCount} />
            <KpiCard label={t("financeAdvances.kpi.settled")} value={kpi.settledCount} />
            <KpiCard label={t("financeAdvances.kpi.canceled")} value={kpi.canceledCount} />
          </div>
        ) : null}

        {/* Filters + Tabs */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <FiltersBar
              left={
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">{t("common.search")}</div>
                    <input
                      value={q}
                      onChange={(e) => setParam("q", e.target.value)}
                      placeholder={t("financeAdvances.filters.searchPh") || "بحث بالمعرف/المشرف..."}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">{t("common.rows")}</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setParam("pageSize", String(e.target.value))}
                        className="rounded-xl border border-gray-200 bg-white px-2 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-end justify-start gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setParam("q", "");
                        setParam("status", "ALL");
                        setParam("pageSize", String(25));
                      }}
                    >
                      {t("common.reset")}
                    </Button>
                  </div>
                </div>
              }
            />
          </div>

          <div className="px-4 py-3 flex flex-wrap gap-2">
            {tabs.map((x) => {
              const active = status === x.key;
              return (
                <button
                  key={x.key}
                  onClick={() => setParam("status", x.key === "ALL" ? "ALL" : x.key)}
                  className={[
                    "px-3 py-2 rounded-xl text-sm border transition inline-flex items-center gap-2",
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {x.label}
                  {typeof x.count === "number" ? (
                    <span
                      className={[
                        "text-xs px-2 py-0.5 rounded-full",
                        active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700",
                      ].join(" ")}
                    >
                      {x.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {err ? <div className="text-sm text-red-600">⚠️ {err}</div> : null}

        {/* Table */}
        <DataTable<AdvanceRow>
          title={t("financeAdvances.table.title") || t("financeAdvances.title")}
          subtitle={
            status === "ALL"
              ? (t("financeAdvances.meta.showingAll") as any)
              : `${t("financeAdvances.table.filteredBy") || "تصفية:"} ${status}`
          }
          columns={columns}
          rows={items}
          loading={loading}
          total={total}
          page={page}
          pages={totalPages}
          onPrev={page <= 1 ? undefined : () => setParam("page", String(page - 1))}
          onNext={page >= totalPages ? undefined : () => setParam("page", String(page + 1))}
          emptyTitle={t("financeAdvances.empty") || "لا يوجد سلف"}
          emptyHint={t("common.tryAdjustFilters") || "جرّب تغيير الفلاتر أو البحث."}
          onRowClick={(row) => router.push(`/finance/advances/${row.id}`)}
        />
      </div>

      <IssueAdvanceModal open={issueOpen} onClose={() => setIssueOpen(false)} onIssued={load} showToast={showToast} />

      <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
    </div>
  );
}