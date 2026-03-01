"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";

// ✅ Design System
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { TabsBar } from "@/src/components/ui/TabsBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

// ✅ Toast path (as you said)
import { Toast } from "@/src/components/Toast";

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

type TabKey = "PENDING" | "APPROVED" | "REJECTED" | "APPEALED" | "ALL";

export default function ExpensesClientPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);

  const role = roleUpper(user?.role);
  const canReview = role === "ADMIN" || role === "ACCOUNTANT";

  // query state
  const status = (sp.get("status") || "PENDING").toUpperCase() as TabKey;
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 1), 200);
  const q = sp.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  // toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    router.push(`/finance/expenses?${p.toString()}`);
  };

  const qsKey = useMemo(() => `${status}|${page}|${pageSize}|${q}`, [status, page, pageSize, q]);

  async function load() {
    if (token === null) return;
    if (!token) return;

    setLoading(true);
    setErr(null);
    try {
      const data = await api.get("/cash/cash-expenses", {
        params: { status, page, page_size: pageSize, q: q || undefined },
      });

      const list = Array.isArray(data) ? data : (data as any)?.items || [];
      const tt = Array.isArray(data) ? list.length : Number((data as any)?.total || 0);

      setItems(list);
      setTotal(tt);

      showToast("success", t("common.refresh"));
    } catch (e: any) {
      const msg = e?.message || t("financeExpenses.errors.loadFailed");
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

  // =========================
  // Approve / Reject Dialogs
  // =========================
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");

  function openApprove(expenseId: string) {
    if (!canReview) return;
    setActiveId(expenseId);
    setApproveNotes("");
    setApproveOpen(true);
  }

  function openReject(expenseId: string) {
    if (!canReview) return;
    setActiveId(expenseId);
    setRejectReason("");
    setRejectNotes("");
    setRejectOpen(true);
  }

  async function confirmApprove() {
    if (!canReview) return;
    if (!activeId) return;

    setActionLoading(true);
    try {
      await api.post(`/cash/cash-expenses/${activeId}/approve`, { notes: approveNotes || null });
      setApproveOpen(false);
      setActiveId(null);
      showToast("success", t("financeExpenses.actions.approve"));
      await load();
    } catch (e: any) {
      showToast("error", e?.message || t("financeExpenses.errors.approveFailed"));
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmReject() {
    if (!canReview) return;
    if (!activeId) return;

    const reason = (rejectReason || "").trim();
    if (reason.length < 2) {
      showToast("error", t("financeExpenses.prompts.rejectReason"));
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/cash/cash-expenses/${activeId}/reject`, {
        reason,
        notes: rejectNotes || null,
      });
      setRejectOpen(false);
      setActiveId(null);
      showToast("success", t("financeExpenses.actions.reject"));
      await load();
    } catch (e: any) {
      showToast("error", e?.message || t("financeExpenses.errors.rejectFailed"));
    } finally {
      setActionLoading(false);
    }
  }

  // =========================
  // Tabs
  // =========================
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "PENDING", label: t("financeExpenses.tabs.PENDING") },
    { key: "APPROVED", label: t("financeExpenses.tabs.APPROVED") },
    { key: "REJECTED", label: t("financeExpenses.tabs.REJECTED") },
    { key: "APPEALED", label: t("financeExpenses.tabs.APPEALED") },
    { key: "ALL", label: t("financeExpenses.tabs.ALL") },
  ];

  // =========================
  // DataTable Columns
  // =========================
  const columns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        key: "id",
        label: t("financeExpenses.table.id"),
        className: "font-mono",
        render: (x) => shortId(x.id),
      },
      {
        key: "amount",
        label: t("financeExpenses.table.amount"),
        className: "font-semibold",
        render: (x) => fmtMoney(x.amount),
      },
      {
        key: "expense_type",
        label: t("financeExpenses.table.type"),
        render: (x) => x.expense_type || "—",
      },
      {
        key: "status",
        label: t("financeExpenses.table.status"),
        render: (x) => {
          const st = String(x.approval_status || x.status || "").toUpperCase();
          return <StatusBadge status={st} />;
        },
      },
      {
        key: "trip",
        label: t("financeExpenses.table.trip"),
        className: "font-mono",
        render: (x) => (x.trip_id ? shortId(x.trip_id) : "—"),
      },
      {
        key: "vehicle",
        label: t("financeExpenses.table.vehicle"),
        render: (x) => x.vehicles?.plate_no || x.vehicles?.plate_number || "—",
      },
      {
        key: "created_at",
        label: t("financeExpenses.table.created"),
        render: (x) => <span className="text-slate-600">{fmtDate(x.created_at)}</span>,
      },
      {
        key: "actions",
        label: t("financeExpenses.table.actions"),
        render: (x) => {
          const st = String(x.approval_status || x.status || "").toUpperCase();
          return (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/finance/expenses/${x.id}`}>
                <Button variant="secondary" className="px-3 py-1.5">
                  {t("common.view")}
                </Button>
              </Link>

              {canReview && st === "PENDING" ? (
                <>
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5"
                    onClick={() => openApprove(String(x.id))}
                  >
                    {t("financeExpenses.actions.approve")}
                  </Button>

                  <Button
                    variant="danger"
                    className="px-3 py-1.5"
                    onClick={() => openReject(String(x.id))}
                  >
                    {t("financeExpenses.actions.reject")}
                  </Button>
                </>
              ) : null}

              {st === "REJECTED" && x.rejection_reason ? (
                <span className="text-xs text-slate-500">
                  {t("financeExpenses.table.reason")}:{" "}
                  <span className="text-[rgb(var(--trex-fg))]">{String(x.rejection_reason)}</span>
                </span>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t, canReview]
  );

  const headerRight = (
    <div className="flex items-center gap-2">
      <Link href="/finance">
        <Button variant="secondary">← {t("sidebar.finance")}</Button>
      </Link>
      <Button onClick={load} isLoading={loading}>
        {loading ? t("common.loading") : t("common.refresh")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("financeExpenses.title")}
        subtitle={
          <span className="text-slate-500">
            {t("common.role")}:{" "}
            <span className="font-semibold text-[rgb(var(--trex-fg))]">{role || "—"}</span>
            {!canReview ? <span className="ms-2">({t("financeExpenses.viewOnly")})</span> : null}
          </span>
        }
        actions={headerRight}
      />

      {/* Tabs */}
      <TabsBar<TabKey> tabs={tabs} value={status} onChange={(k) => setParam("status", k)} />

      {/* Filters */}
      <Card>
        <FiltersBar
          left={
            <input
              value={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder={t("financeExpenses.filters.searchPlaceholder")}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] text-sm outline-none"
            />
          }
          right={
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-500">
                {t("common.total")}:{" "}
                <span className="font-semibold text-[rgb(var(--trex-fg))]">{total}</span>
                {" — "}
                {t("common.page")}{" "}
                <span className="font-semibold text-[rgb(var(--trex-fg))]">
                  {page}/{totalPages}
                </span>
              </div>

              <select
                value={String(pageSize)}
                onChange={(e) => setParam("pageSize", e.target.value)}
                className="px-3 py-2 rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] text-sm outline-none"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          }
        />
      </Card>

      {err ? (
        <Card className="border-red-500/20">
          <div className="text-sm text-red-600">{err}</div>
        </Card>
      ) : null}

      <DataTable
        title={t("financeExpenses.title")}
        subtitle={t("financeExpenses.meta.showing", { count: items.length, total })}
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle={t("financeExpenses.empty")}
        emptyHint={t("financeExpenses.filters.searchPlaceholder")}
        total={total}
        page={page}
        pages={totalPages}
        onPrev={page > 1 ? () => setParam("page", String(page - 1)) : undefined}
        onNext={page < totalPages ? () => setParam("page", String(page + 1)) : undefined}
      />

      {/* Approve Dialog */}
      <ConfirmDialog
        open={approveOpen}
        title={t("financeExpenses.actions.approve")}
        description={
          <div className="space-y-2">
            <div className="text-sm text-slate-600">{t("financeExpenses.prompts.approveNotes")}</div>
            <textarea
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              className="w-full min-h-[90px] px-3 py-2 rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] text-sm outline-none"
              placeholder={t("financeExpenses.prompts.approveNotes")}
            />
            <div className="text-xs text-slate-500">{t("common.optional") || "اختياري"}</div>
          </div>
        }
        confirmText={t("financeExpenses.actions.approve")}
        cancelText={t("common.cancel")}
        tone="info"
        isLoading={actionLoading}
        onClose={() => {
          if (actionLoading) return;
          setApproveOpen(false);
          setActiveId(null);
        }}
        onConfirm={confirmApprove}
      />

      {/* Reject Dialog */}
      <ConfirmDialog
        open={rejectOpen}
        title={t("financeExpenses.actions.reject")}
        description={
          <div className="space-y-2">
            <div className="text-sm text-slate-600">{t("financeExpenses.prompts.rejectReason")}</div>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] text-sm outline-none"
              placeholder={t("financeExpenses.prompts.rejectReason")}
            />

            <div className="text-sm text-slate-600">{t("financeExpenses.prompts.rejectNotes")}</div>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="w-full min-h-[90px] px-3 py-2 rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] text-sm outline-none"
              placeholder={t("financeExpenses.prompts.rejectNotes")}
            />
          </div>
        }
        confirmText={t("financeExpenses.actions.reject")}
        cancelText={t("common.cancel")}
        tone="danger"
        isLoading={actionLoading}
        onClose={() => {
          if (actionLoading) return;
          setRejectOpen(false);
          setActiveId(null);
        }}
        onConfirm={confirmReject}
      />

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}