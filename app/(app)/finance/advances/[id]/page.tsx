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

function norm(value: unknown): string {
  return String(value || "").toUpperCase();
}

function fmtMoney(value: unknown): string {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ar-EG");
}

function shortId(id: unknown): string {
  const s = String(id ?? "");
  if (s.length <= 14) return s || "—";
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function LocalStatusBadge({ status }: { status?: string | null }) {
  const st = norm(status);

  const cls =
    st === "OPEN"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : st === "SETTLED"
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : ["CANCELLED", "CANCELED"].includes(st)
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-slate-50 text-slate-700 border-slate-200";

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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<React.ReactNode>("تأكيد");
  const [confirmDesc, setConfirmDesc] = useState<React.ReactNode>("");
  const [confirmTone, setConfirmTone] = useState<"danger" | "warning" | "info">("warning");
  const [confirmText, setConfirmText] = useState("تأكيد");
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void> | void)>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
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
        e?.response?.data?.message ||
        e?.message ||
        t("financeAdvanceDetails.errors.loadFailed");

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
      setError("Invalid advance id");
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
      .filter((expense) => ["APPROVED", "REAPPROVED"].includes(norm(expense.approval_status)))
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
      showToast("success", "تم إرسال العهدة للمراجعة");
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

      showToast("success", "تم إغلاق العهدة");
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
      await cashAdvancesService.reopen(advanceId, {
        notes: notes?.trim() || null,
      });

      showToast("success", "تم إعادة فتح العهدة");
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
    { key: "overview" as const, label: t("financeAdvanceDetails.tabs.overview") || "نظرة عامة" },
    { key: "expenses" as const, label: t("financeAdvanceDetails.tabs.expenses") || "المصروفات" },
    { key: "actions" as const, label: t("financeAdvanceDetails.tabs.actions") || "إجراءات" },
  ];

  const expenseColumns: DataTableColumn<CashExpense>[] = [
    {
      key: "amount",
      label: t("financeAdvanceDetails.expenses.table.amount") || "المبلغ",
      render: (expense) => <span className="font-semibold">{fmtMoney(expense.amount)}</span>,
    },
    {
      key: "type",
      label: t("financeAdvanceDetails.expenses.table.type") || "النوع",
      render: (expense) => expense.expense_type || "—",
    },
    {
      key: "status",
      label: t("financeAdvanceDetails.expenses.table.status") || "الحالة",
      render: (expense) => (
        <span className="text-slate-700">{norm(expense.approval_status) || "—"}</span>
      ),
    },
    {
      key: "created",
      label: t("financeAdvanceDetails.expenses.table.created") || "تاريخ الإنشاء",
      render: (expense) => <span className="text-slate-600">{fmtDate(expense.created_at)}</span>,
    },
    {
      key: "link",
      label: t("financeAdvanceDetails.expenses.table.link") || "الرابط",
      render: (expense) => (
        <Link href={`/finance/expenses/${expense.id}`}>
          <Button type="button" variant="secondary">
            {t("common.view")}
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <span>{t("financeAdvanceDetails.title")}</span>
            {advance?.status ? <LocalStatusBadge status={advance.status} /> : null}
          </div>
        }
        subtitle={
          <div className="text-sm text-slate-500">
            {t("financeAdvanceDetails.labels.id") || "المعرّف"}:{" "}
            <span className="font-mono text-[rgb(var(--trex-fg))]">{advanceId || "—"}</span>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {t("financeAdvanceDetails.buttons.back") || t("common.back")}
            </Button>

            <Link href="/finance/advances">
              <Button type="button" variant="secondary">
                {t("financeAdvanceDetails.buttons.list") || t("common.list")}
              </Button>
            </Link>

            <Button
              type="button"
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
              type="button"
              onClick={() => setTab(tabItem.key)}
              className={[
                "px-3 py-2 rounded-xl text-sm border transition",
                active
                  ? "bg-[rgb(var(--trex-fg))] text-[rgb(var(--trex-bg))] border-[rgb(var(--trex-fg))]"
                  : "bg-[rgb(var(--trex-card))] text-[rgb(var(--trex-fg))] border-black/10 hover:bg-black/5",
              ].join(" ")}
            >
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card>
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        </Card>
      ) : tab === "overview" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard label="قيمة العهدة" value={fmtMoney(totals.advanceAmount)} />
            <KpiCard label="المعتمد المصروف" value={fmtMoney(totals.approved)} />
            <KpiCard label="المتبقي" value={fmtMoney(totals.remaining)} />
            <KpiCard label="قيد الانتظار" value={fmtMoney(totals.pending)} />
            <KpiCard label="مرفوض" value={fmtMoney(totals.rejected)} />
          </div>

          <Card title="نظرة عامة">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">المشرف</div>
                <div className="mt-1 font-medium">
                  {advance?.users_cash_advances_field_supervisor_idTousers?.full_name ||
                    advance?.users_cash_advances_field_supervisor_idTousers?.email ||
                    advance?.field_supervisor_id ||
                    "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">تاريخ الإنشاء</div>
                <div className="mt-1 font-medium">{fmtDate(advance?.created_at)}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">تاريخ التسوية</div>
                <div className="mt-1 font-medium">{fmtDate(advance?.settled_at)}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">ملاحظات التسوية</div>
                <div className="mt-1 font-medium whitespace-pre-wrap">
                  {advance?.settlement_notes || "—"}
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : tab === "expenses" ? (
        <DataTable<CashExpense>
          title="المصروفات المرتبطة بهذه العهدة"
          columns={expenseColumns}
          rows={expenses}
          loading={loading}
          emptyTitle="لا توجد مصروفات"
          emptyHint="يمكنك إضافة مصروف جديد من صفحة المصروفات."
          onRowClick={(row) => router.push(`/finance/expenses/${row.id}`)}
        />
      ) : (
        <Card title="الإجراءات">
          <div className="space-y-3">
            <div className="text-sm">
              الدور: <b>{role || "—"}</b> — الحالة: <b>{status || "—"}</b>
            </div>

            {!isPrivileged ? (
              <div className="text-sm text-slate-500">
                لا توجد إجراءات متاحة لهذا الدور.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {status === "OPEN" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      openConfirm({
                        title: "إرسال للمراجعة",
                        description: "هل تريد إرسال العهدة للمراجعة؟",
                        action: submitReview,
                      })
                    }
                  >
                    إرسال للمراجعة
                  </Button>
                ) : null}

                {status !== "SETTLED" ? (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={busy}
                    onClick={() =>
                      openConfirm({
                        title: "إغلاق العهدة",
                        description: "هل تريد إغلاق العهدة الآن؟",
                        tone: "info",
                        action: async () => {
                          const notes = window.prompt("ملاحظة/مرجع إغلاق (اختياري):") || "";

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
                    إغلاق العهدة
                  </Button>
                ) : null}

                {status === "SETTLED" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      openConfirm({
                        title: "إعادة فتح العهدة",
                        description: "هل تريد إعادة فتح العهدة؟",
                        action: async () => {
                          const notes = window.prompt("ملاحظة (اختياري):") || "";
                          await reopenAdvance(notes);
                        },
                      })
                    }
                  >
                    إعادة فتح
                  </Button>
                ) : null}
              </div>
            )}
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
  );
}