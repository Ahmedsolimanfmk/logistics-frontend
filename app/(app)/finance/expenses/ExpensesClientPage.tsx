"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { TabsBar } from "@/src/components/ui/TabsBar";
import { Card } from "@/src/components/ui/Card";

import { cashExpensesService } from "@/src/services/cash-expenses.service";
import type {
  CashExpense,
  CashExpenseListStatusFilter,
  CashExpenseSummaryTotals,
} from "@/src/types/cash-expenses.types";

function roleUpper(role: unknown): string {
  return String(role || "").toUpperCase();
}

function fmtMoney(value: unknown): string {
  const v = Number(value || 0);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ar-EG");
}

function shortId(id: unknown): string {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function expenseStatus(expense: CashExpense): string {
  return String(expense.approval_status || expense.status || "").toUpperCase();
}

type TabKey = CashExpenseListStatusFilter;

export default function ExpensesClientPage(): React.ReactElement {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);

  const role = roleUpper(user?.role);
  const canReview = role === "ADMIN" || role === "ACCOUNTANT";

  const status = (sp.get("status") || "PENDING").toUpperCase() as TabKey;
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 1), 200);
  const q = sp.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<CashExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<CashExpenseSummaryTotals | null>(null);

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

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);

    if (key !== "page") params.set("page", "1");

    router.push(`/finance/expenses?${params.toString()}`);
  };

  const qsKey = useMemo(() => `${status}|${page}|${pageSize}|${q}`, [status, page, pageSize, q]);

  async function load() {
    if (token === null || !token) return;

    setLoading(true);
    setErr(null);

    try {
      const [listRes, summaryRes] = await Promise.all([
        cashExpensesService.list({
          status,
          page,
          page_size: pageSize,
          q: q || undefined,
        }),
        cashExpensesService.getSummary({
          status,
          q: q || undefined,
        }),
      ]);

      setItems(listRes.items);
      setTotal(listRes.total);
      setSummary(summaryRes.totals);

      showToast("success", t("common.refresh"));
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || t("financeExpenses.errors.loadFailed");
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
  }, [qsKey, token]);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

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

  async function submitApprove() {
    if (!canReview || !activeId) return;

    setBusy(true);
    try {
      await cashExpensesService.approve(activeId, {
        notes: approveNotes || null,
      });
      showToast("success", t("common.save") || t("common.saved") || "تم الحفظ");
      setApproveOpen(false);
      setActiveId("");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || t("financeExpenses.errors.approveFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    if (!canReview || !activeId) return;

    const reason = rejectReason.trim();
    const notes = rejectNotes.trim();

    if (reason.length < 2) {
      showToast("error", t("financeExpenses.prompts.rejectReason") || "سبب الرفض مطلوب");
      return;
    }

    setBusy(true);
    try {
      await cashExpensesService.reject(activeId, {
        reason,
        notes: notes || null,
      });
      showToast("success", t("common.save") || t("common.saved") || "تم الحفظ");
      setRejectOpen(false);
      setActiveId("");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || t("financeExpenses.errors.rejectFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "PENDING", label: t("financeExpenses.tabs.PENDING") },
    { key: "APPROVED", label: t("financeExpenses.tabs.APPROVED") },
    { key: "REJECTED", label: t("financeExpenses.tabs.REJECTED") },
    { key: "APPEALED", label: t("financeExpenses.tabs.APPEALED") },
    { key: "ALL", label: t("financeExpenses.tabs.ALL") },
  ];

  const kpi = useMemo(() => {
    if (summary) {
      return {
        sumAll: Number(summary.sumAll || 0),
        sumApproved: Number(summary.sumApproved || 0),
        sumPending: Number(summary.sumPending || 0),
        sumRejected: Number(summary.sumRejected || 0),
        sumAppealed: Number(summary.sumAppealed || 0),
      };
    }

    const sumAll = items.reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const sumApproved = items
      .filter((x) => ["APPROVED", "REAPPROVED"].includes(expenseStatus(x)))
      .reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const sumPending = items
      .filter((x) => expenseStatus(x) === "PENDING")
      .reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const sumRejected = items
      .filter((x) => expenseStatus(x) === "REJECTED")
      .reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const sumAppealed = items
      .filter((x) => expenseStatus(x) === "APPEALED")
      .reduce((acc, x) => acc + Number(x.amount || 0), 0);

    return { sumAll, sumApproved, sumPending, sumRejected, sumAppealed };
  }, [items, summary]);

  const pageTotal = useMemo(
    () => items.reduce((acc, x) => acc + Number(x.amount || 0), 0),
    [items]
  );

  const columns: DataTableColumn<CashExpense>[] = useMemo(
    () => [
      {
        key: "id",
        label: t("financeExpenses.table.id"),
        render: (x) => <span className="font-mono text-xs">{shortId(x.id)}</span>,
      },
      {
        key: "amount",
        label: t("financeExpenses.table.amount"),
        render: (x) => <span className="font-semibold">{fmtMoney(x.amount)}</span>,
      },
      {
        key: "type",
        label: t("financeExpenses.table.type"),
        render: (x) => x.expense_type || "—",
      },
      {
        key: "status",
        label: t("financeExpenses.table.status"),
        render: (x) => <StatusBadge status={expenseStatus(x)} />,
      },
      {
        key: "trip",
        label: t("financeExpenses.table.trip"),
        render: (x) =>
          x.trip_id ? <span className="font-mono text-xs">{shortId(x.trip_id)}</span> : "—",
      },
      {
        key: "vehicle",
        label: t("financeExpenses.table.vehicle"),
        render: (x) => x.vehicles?.plate_no || x.vehicles?.plate_number || "—",
      },
      {
        key: "created",
        label: t("financeExpenses.table.created"),
        render: (x) => <span className="text-slate-600">{fmtDate(x.created_at)}</span>,
      },
      {
        key: "actions",
        label: t("financeExpenses.table.actions"),
        render: (x) => {
          const st = expenseStatus(x);

          return (
            <div className="flex flex-wrap items-center gap-2 justify-start">
              <Link href={`/finance/expenses/${x.id}`}>
                <Button variant="secondary">{t("common.view")}</Button>
              </Link>

              {canReview && st === "PENDING" ? (
                <>
                  <Button variant="primary" onClick={() => openApprove(x.id)}>
                    {t("financeExpenses.actions.approve")}
                  </Button>
                  <Button variant="danger" onClick={() => openReject(x.id)}>
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

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title={t("financeExpenses.title")}
        subtitle={
          <span className="text-slate-500">
            {t("common.role")}:{" "}
            <span className="font-semibold text-[rgb(var(--trex-fg))]">{role || "—"}</span>
            {!canReview ? <span className="ms-2">({t("financeExpenses.viewOnly")})</span> : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/finance">
              <Button variant="secondary">{t("sidebar.finance")}</Button>
            </Link>
            <Button onClick={load} disabled={loading} isLoading={loading} variant="secondary">
              {loading ? t("common.loading") : t("common.refresh")}
            </Button>
          </div>
        }
      />

      <TabsBar<TabKey> tabs={tabs} value={status} onChange={(k) => setParam("status", k)} />

      <Card>
        <FiltersBar
          left={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              <div>
                <div className="text-xs text-slate-500 mb-1">{t("common.search")}</div>
                <input
                  value={q}
                  onChange={(e) => setParam("q", e.target.value)}
                  placeholder={t("financeExpenses.filters.searchPlaceholder")}
                  className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
                />
              </div>

              <div className="flex items-end">
                <div className="text-xs text-slate-500">
                  {t("common.total")}:{" "}
                  <span className="font-semibold text-[rgb(var(--trex-fg))]">{total}</span>
                  {" — "}
                  {t("common.page")}{" "}
                  <span className="font-semibold text-[rgb(var(--trex-fg))]">
                    {page}/{totalPages}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-start gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">{t("common.rows")}</span>
                  <select
                    value={String(pageSize)}
                    onChange={(e) => setParam("pageSize", e.target.value)}
                    className="rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-2 py-2 outline-none text-sm"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setParam("q", "");
                    setParam("status", "PENDING");
                    setParam("pageSize", "25");
                  }}
                >
                  {t("common.reset")}
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      {!loading && !err ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label={t("financeExpenses.kpi.total")} value={fmtMoney(kpi.sumAll)} />
          <KpiCard label={t("financeExpenses.kpi.approved")} value={fmtMoney(kpi.sumApproved)} />
          <KpiCard label={t("financeExpenses.kpi.pending")} value={fmtMoney(kpi.sumPending)} />
          <KpiCard label={t("financeExpenses.kpi.rejected")} value={fmtMoney(kpi.sumRejected)} />
          <KpiCard label={t("financeExpenses.kpi.appealed")} value={fmtMoney(kpi.sumAppealed)} />
        </div>
      ) : null}

      {err ? (
        <Card className="border-red-500/20">
          <div className="text-sm text-red-600">⚠️ {err}</div>
        </Card>
      ) : null}

      <DataTable<CashExpense>
        title={t("financeExpenses.title")}
        columns={columns}
        rows={items}
        loading={loading}
        total={total}
        page={page}
        pages={totalPages}
        onPrev={page <= 1 ? undefined : () => setParam("page", String(page - 1))}
        onNext={page >= totalPages ? undefined : () => setParam("page", String(page + 1))}
        emptyTitle={t("financeExpenses.empty") || "لا يوجد مصروفات"}
        emptyHint={t("common.tryAdjustFilters") || "جرّب تغيير الفلاتر أو البحث."}
        footer={
          <div className="text-xs text-slate-500">
            {t("common.total")}:{" "}
            <span className="font-semibold text-[rgb(var(--trex-fg))]">{fmtMoney(pageTotal)}</span>
          </div>
        }
        onRowClick={(row) => router.push(`/finance/expenses/${row.id}`)}
      />

      <ConfirmDialog
        open={approveOpen}
        title={t("financeExpenses.actions.approve") || "اعتماد المصروف"}
        description={
          <div className="space-y-2">
            <div className="text-sm text-slate-600">
              {t("financeExpenses.prompts.approveNotes") || "ملاحظات (اختياري)"}
            </div>
            <textarea
              rows={3}
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
              placeholder={t("common.optional") || "اختياري"}
              disabled={busy}
            />
          </div>
        }
        confirmText={t("financeExpenses.actions.approve") || "اعتماد"}
        cancelText={t("common.cancel") || "إلغاء"}
        tone="info"
        isLoading={busy}
        dir="rtl"
        onClose={() => {
          if (busy) return;
          setApproveOpen(false);
          setActiveId("");
        }}
        onConfirm={submitApprove}
      />

      <ConfirmDialog
        open={rejectOpen}
        title={t("financeExpenses.actions.reject") || "رفض المصروف"}
        description={
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-600 mb-1">
                {t("financeExpenses.prompts.rejectReason") || "سبب الرفض *"}
              </div>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
                placeholder={t("financeExpenses.prompts.rejectReason") || "اكتب سبب الرفض..."}
                disabled={busy}
              />
              <div className="text-[11px] text-slate-500 mt-1">الحد الأدنى حرفين.</div>
            </div>

            <div>
              <div className="text-sm text-slate-600 mb-1">
                {t("financeExpenses.prompts.rejectNotes") || "ملاحظات (اختياري)"}
              </div>
              <textarea
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
                placeholder={t("common.optional") || "اختياري"}
                disabled={busy}
              />
            </div>
          </div>
        }
        confirmText={t("financeExpenses.actions.reject") || "رفض"}
        cancelText={t("common.cancel") || "إلغاء"}
        tone="danger"
        isLoading={busy}
        dir="rtl"
        onClose={() => {
          if (busy) return;
          setRejectOpen(false);
          setActiveId("");
        }}
        onConfirm={submitReject}
      />

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        dir="rtl"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}