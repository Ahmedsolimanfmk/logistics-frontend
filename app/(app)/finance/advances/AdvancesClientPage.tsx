"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/Toast";

import { cashAdvancesService } from "@/src/services/cash-advances.service";
import type { CashAdvance } from "@/src/types/cash-advances.types";
import type { CashExpense } from "@/src/types/cash-expenses.types";

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

function norm(value: unknown): string {
  return String(value || "").toUpperCase();
}

function LocalStatusBadge({ status }: { status: string }) {
  const st = norm(status);
  const cls =
    st === "OPEN"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : st === "SETTLED"
      ? "bg-gray-50 text-gray-700 border-gray-200"
      : ["CANCELLED", "CANCELED"].includes(st)
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${cls}`}>
      {st || "—"}
    </span>
  );
}

type TabKey = "overview" | "expenses" | "actions";

export default function AdvanceDetailsPage(): React.ReactElement {
  const t = useT();
  const params = useParams();
  const router = useRouter();

  const rawId = (params as Record<string, string | string[] | undefined>)?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const advanceId =
    typeof id === "string" && id && id !== "undefined" && id !== "null" ? id : "";

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";
  const isSupervisor = role === "FIELD_SUPERVISOR";

  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [advance, setAdvance] = useState<CashAdvance | null>(null);
  const [expenses, setExpenses] = useState<CashExpense[]>([]);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  async function loadAll() {
    if (!advanceId) return;

    setLoading(true);
    setError(null);

    try {
      const [advanceRes, expensesRes] = await Promise.all([
        cashAdvancesService.getById(advanceId),
        cashAdvancesService.getExpenses(advanceId),
      ]);

      setAdvance(advanceRes);
      setExpenses(expensesRes);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || t("financeAdvanceDetails.errors.loadFailed");
      setError(msg);
      setAdvance(null);
      setExpenses([]);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!advanceId) {
      setLoading(false);
      setAdvance(null);
      setExpenses([]);
      setError(t("financeAdvanceDetails.errors.invalidId"));
      return;
    }

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceId]);

  useEffect(() => {
    if (!advance || !isSupervisor) return;

    if (advance.field_supervisor_id && advance.field_supervisor_id !== user?.id) {
      setError(t("financeAdvanceDetails.errors.forbiddenNotYours"));
    }
  }, [advance, isSupervisor, t, user?.id]);

  const totals = useMemo(() => {
    const approved = expenses
      .filter((expense) =>
        ["APPROVED", "REAPPROVED"].includes(norm(expense.approval_status))
      )
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const pending = expenses
      .filter((expense) => norm(expense.approval_status) === "PENDING")
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const rejected = expenses
      .filter((expense) => norm(expense.approval_status) === "REJECTED")
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const advanceAmount = Number(advance?.amount || 0);
    const remaining = advanceAmount - approved;

    return { approved, pending, rejected, advanceAmount, remaining };
  }, [expenses, advance?.amount]);

  const status = norm(advance?.status);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<React.ReactNode>("تأكيد");
  const [confirmDesc, setConfirmDesc] = useState<React.ReactNode>("");
  const [confirmTone, setConfirmTone] = useState<"danger" | "warning" | "info">("warning");
  const [confirmText, setConfirmText] = useState("تأكيد");
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void> | void)>(null);

  function openConfirm(opts: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    tone?: "danger" | "warning" | "info";
    confirmText?: string;
    action: () => Promise<void> | void;
  }) {
    setConfirmTitle(opts.title ?? "تأكيد");
    setConfirmDesc(opts.description ?? "");
    setConfirmTone(opts.tone ?? "warning");
    setConfirmText(opts.confirmText ?? "تأكيد");
    setConfirmAction(() => opts.action);
    setConfirmOpen(true);
  }

  async function submitReview() {
    if (!isPrivileged || !advanceId) return;

    setBusy(true);
    setError(null);
    try {
      await cashAdvancesService.submitReview(advanceId);
      showToast("success", t("common.saved") || "تم الحفظ");
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t("financeAdvanceDetails.errors.submitReviewFailed");
      setError(msg);
      showToast("error", msg);
    } finally {
      setBusy(false);
    }
  }

  async function closeAdvance(
    settlementType: "FULL" | "PARTIAL" | "ADJUSTED" | "CANCELLED",
    amount: number,
    notes?: string
  ) {
    if (!isPrivileged || !advanceId) return;

    setBusy(true);
    setError(null);
    try {
      await cashAdvancesService.close(advanceId, {
        settlement_type: settlementType,
        amount,
        notes: notes?.trim() || null,
      });
      showToast("success", t("common.saved") || "تم الحفظ");
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t("financeAdvanceDetails.errors.closeFailed");
      setError(msg);
      showToast("error", msg);
    } finally {
      setBusy(false);
    }
  }

  async function reopenAdvance(notes?: string) {
    if (!isPrivileged || !advanceId) return;

    setBusy(true);
    setError(null);
    try {
      await cashAdvancesService.reopen(advanceId, { notes: notes?.trim() || null });
      showToast("success", t("common.saved") || "تم الحفظ");
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t("financeAdvanceDetails.errors.reopenFailed");
      setError(msg);
      showToast("error", msg);
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    { key: "overview" as const, label: t("financeAdvanceDetails.tabs.overview") },
    { key: "expenses" as const, label: t("financeAdvanceDetails.tabs.expenses") },
    { key: "actions" as const, label: t("financeAdvanceDetails.tabs.actions") },
  ];

  const expenseColumns: DataTableColumn<CashExpense>[] = [
    {
      key: "amount",
      label: t("financeAdvanceDetails.expenses.table.amount"),
      render: (expense) => <span className="font-semibold">{fmtMoney(expense.amount)}</span>,
    },
    {
      key: "type",
      label: t("financeAdvanceDetails.expenses.table.type"),
      render: (expense) => expense.expense_type || "—",
    },
    {
      key: "status",
      label: t("financeAdvanceDetails.expenses.table.status"),
      render: (expense) => <span className="text-gray-700">{norm(expense.approval_status) || "—"}</span>,
    },
    {
      key: "created",
      label: t("financeAdvanceDetails.expenses.table.created"),
      render: (expense) => <span className="text-gray-600">{fmtDate(expense.created_at)}</span>,
    },
    {
      key: "link",
      label: t("financeAdvanceDetails.expenses.table.link"),
      headerClassName: "text-left",
      className: "text-left",
      render: (expense) => (
        <Link href={`/finance/expenses/${expense.id}`}>
          <Button variant="secondary">{t("common.view")}</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <span>{t("financeAdvanceDetails.title")}</span>
              {advance?.status ? <LocalStatusBadge status={String(advance.status)} /> : null}
            </div>
          }
          subtitle={
            <div className="text-sm text-gray-600">
              {t("financeAdvanceDetails.labels.id")}:{" "}
              <span className="font-mono text-gray-900">{advanceId || "—"}</span>
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => router.back()}>
                {t("financeAdvanceDetails.buttons.back") || t("common.back")}
              </Button>
              <Link href="/finance/advances">
                <Button variant="secondary">
                  {t("financeAdvanceDetails.buttons.list") || t("common.list")}
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={loadAll}
                disabled={loading || busy}
                isLoading={loading || busy}
              >
                {t("financeAdvanceDetails.buttons.refresh") || t("common.refresh")}
              </Button>
            </div>
          }
        />

        {error ? (
          <Card className="border-red-500/20">
            <div className="text-sm text-red-600">⚠️ {error}</div>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {tabs.map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                onClick={() => setTab(tabItem.key)}
                className={[
                  "px-3 py-2 rounded-xl text-sm border transition",
                  active
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                {tabItem.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <Card>
            <div className="text-sm text-gray-600">{t("common.loading")}</div>
          </Card>
        ) : tab === "overview" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <KpiCard
                label={t("financeAdvanceDetails.kpis.advanceAmount")}
                value={fmtMoney(totals.advanceAmount)}
              />
              <KpiCard
                label={t("financeAdvanceDetails.kpis.approvedUsed")}
                value={fmtMoney(totals.approved)}
              />
              <KpiCard
                label={t("financeAdvanceDetails.kpis.remaining")}
                value={fmtMoney(totals.remaining)}
              />
              <KpiCard
                label={t("financeAdvanceDetails.kpis.pending")}
                value={fmtMoney(totals.pending)}
              />
              <KpiCard
                label={t("financeAdvanceDetails.kpis.rejected")}
                value={fmtMoney(totals.rejected)}
              />
            </div>

            <Card title={t("financeAdvanceDetails.tabs.overview")}>
              <div className="space-y-2">
                <div className="text-xs text-gray-600">
                  {t("financeAdvanceDetails.labels.supervisor")}
                </div>
                <div className="text-sm text-gray-900">
                  {advance?.users_cash_advances_field_supervisor_idTousers?.full_name ||
                    advance?.users_cash_advances_field_supervisor_idTousers?.email ||
                    advance?.field_supervisor_id ||
                    "—"}
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  {t("financeAdvanceDetails.labels.createdAt")}
                </div>
                <div className="text-sm text-gray-900">{fmtDate(advance?.created_at)}</div>

                <div className="mt-2 text-xs text-gray-600">
                  {t("financeAdvanceDetails.labels.notes")}
                </div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {advance?.settlement_notes || "—"}
                </div>
              </div>
            </Card>
          </>
        ) : tab === "expenses" ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-900">
                {t("financeAdvanceDetails.expenses.title")}
              </div>
              <Link href="/finance/expenses/new">
                <Button variant="primary">{t("financeAdvanceDetails.buttons.newExpense")}</Button>
              </Link>
            </div>

            <DataTable<CashExpense>
              title={t("financeAdvanceDetails.expenses.title")}
              subtitle={
                <span className="text-gray-600">
                  {t("financeAdvanceDetails.labels.id")}:{" "}
                  <span className="font-mono">{shortId(advanceId)}</span>
                </span>
              }
              columns={expenseColumns}
              rows={expenses}
              loading={loading}
              emptyTitle={t("financeAdvanceDetails.expenses.empty") || "لا يوجد مصروفات"}
              emptyHint={t("common.tryAdjustFilters") || "يمكنك إضافة مصروف جديد من الزر بالأعلى."}
              onRowClick={(row) => router.push(`/finance/expenses/${row.id}`)}
            />
          </>
        ) : (
          <Card title={t("financeAdvanceDetails.actions.title")}>
            <div className="space-y-3">
              <div className="text-sm text-gray-900">
                <span className="font-semibold">{t("financeAdvanceDetails.actions.title")}</span>{" "}
                <span className="text-xs text-gray-600">
                  ({t("financeAdvanceDetails.actions.role")}: {role || "—"} /{" "}
                  {t("financeAdvanceDetails.actions.status")}: {status || "—"})
                </span>
              </div>

              {!isPrivileged ? (
                <div className="text-sm text-gray-600">
                  {t("financeAdvanceDetails.actions.notAvailable")}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {status === "OPEN" ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        openConfirm({
                          title: t("financeAdvanceDetails.actions.submitReview"),
                          description:
                            t("financeAdvanceDetails.confirm.submitReview") ||
                            "إرسال العهدة للمراجعة؟",
                          tone: "warning",
                          action: submitReview,
                        })
                      }
                    >
                      {t("financeAdvanceDetails.actions.submitReview")}
                    </Button>
                  ) : null}

                  {status !== "SETTLED" ? (
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() =>
                        openConfirm({
                          title: t("financeAdvanceDetails.actions.close"),
                          description:
                            t("financeAdvanceDetails.confirm.close") ||
                            "هل تريد إغلاق العهدة الآن؟",
                          tone: "info",
                          action: async () => {
                            const notes =
                              window.prompt(
                                t("financeAdvanceDetails.prompts.closeNotesOptional")
                              ) || "";

                            let settlementType: "FULL" | "PARTIAL" | "ADJUSTED" | "CANCELLED" =
                              "FULL";
                            let amount = Number(Math.max(totals.remaining, 0).toFixed(2));

                            if (totals.remaining < 0) {
                              settlementType = "PARTIAL";
                              amount = Number(Math.abs(totals.remaining).toFixed(2));
                            }

                            await closeAdvance(settlementType, amount, notes);
                          },
                        })
                      }
                    >
                      {t("financeAdvanceDetails.actions.close")}
                    </Button>
                  ) : null}

                  {status === "SETTLED" ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        openConfirm({
                          title: t("financeAdvanceDetails.actions.reopen"),
                          description:
                            t("financeAdvanceDetails.confirm.reopen") ||
                            "هل تريد إعادة فتح العهدة؟",
                          tone: "warning",
                          action: async () => {
                            const notes =
                              window.prompt(
                                t("financeAdvanceDetails.prompts.reopenNotesOptional")
                              ) || "";
                            await reopenAdvance(notes);
                          },
                        })
                      }
                    >
                      {t("financeAdvanceDetails.actions.reopen")}
                    </Button>
                  ) : null}
                </div>
              )}

              <div className="text-xs text-gray-600">{t("financeAdvanceDetails.hints.endpoints")}</div>
            </div>
          </Card>
        )}

        <ConfirmDialog
          open={confirmOpen}
          title={confirmTitle}
          description={confirmDesc}
          confirmText={confirmText}
          cancelText={t("common.cancel") || "إلغاء"}
          tone={confirmTone}
          isLoading={confirmBusy}
          dir="rtl"
          onClose={() => {
            if (confirmBusy) return;
            setConfirmOpen(false);
          }}
          onConfirm={async () => {
            if (!confirmAction) return;
            setConfirmBusy(true);
            try {
              await confirmAction();
            } finally {
              setConfirmBusy(false);
              setConfirmOpen(false);
            }
          }}
        />

        <Toast
          open={toastOpen}
          message={toastMsg}
          type={toastType}
          dir="rtl"
          onClose={() => setToastOpen(false)}
        />
      </div>
    </div>
  );
}