// app/(app)/finance/advances/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

// ✅ UI System (Light)
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
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

function norm(s: any) {
  return String(s || "").toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const st = norm(status);
  const cls =
    st === "OPEN"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : st === "IN_REVIEW"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : st === "CLOSED"
      ? "bg-gray-50 text-gray-700 border-gray-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${cls}`}>{st || "—"}</span>;
}

type TabKey = "overview" | "expenses" | "actions";

export default function AdvanceDetailsPage(): React.ReactElement {
  const t = useT();
  const params = useParams();
  const router = useRouter();

  // ✅ robust id parsing (avoid "undefined" string)
  const rawId = (params as any)?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const advanceId = typeof id === "string" && id && id !== "undefined" && id !== "null" ? id : "";

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";
  const isSupervisor = role === "FIELD_SUPERVISOR";

  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [advance, setAdvance] = useState<any | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Toast
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
      const [aRes, exRes] = await Promise.all([
        api.get(`/cash/cash-advances/${advanceId}`),
        api
          .get(`/cash/cash-advances/${advanceId}/expenses`)
          .then((r) => r)
          .catch(() => ({ data: [] } as any)),
      ]);

      const a = (aRes as any)?.data ?? aRes;
      const ex = (exRes as any)?.data ?? exRes;

      setAdvance(a);
      setExpenses(Array.isArray(ex) ? ex : []);
    } catch (e: any) {
      const msg = e?.message || t("financeAdvanceDetails.errors.loadFailed");
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

  // security: supervisor can only see his advance (soft check)
  useEffect(() => {
    if (!advance || !isSupervisor) return;
    if (advance.field_supervisor_id && advance.field_supervisor_id !== user?.id) {
      setError(t("financeAdvanceDetails.errors.forbiddenNotYours"));
    }
  }, [advance, isSupervisor, user?.id, t]);

  // computed totals
  const totals = useMemo(() => {
    const approved = expenses
      .filter((x) => norm(x.approval_status) === "APPROVED" || norm(x.approval_status) === "REAPPROVED")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const pending = expenses
      .filter((x) => norm(x.approval_status) === "PENDING")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const rejected = expenses
      .filter((x) => norm(x.approval_status) === "REJECTED")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const advanceAmount = Number(advance?.amount || 0);
    const remaining = advanceAmount - approved;

    return { approved, pending, rejected, advanceAmount, remaining };
  }, [expenses, advance?.amount]);

  const st = norm(advance?.status);

  // -------- Confirm Dialog (generic) --------
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
      await api.post(`/cash/cash-advances/${advanceId}/submit-review`, {});
      showToast("success", t("common.saved") || "تم الحفظ");
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      const msg = e?.message || t("financeAdvanceDetails.errors.submitReviewFailed");
      setError(msg);
      showToast("error", msg);
    } finally {
      setBusy(false);
    }
  }

  async function closeAdvance(notes?: string) {
    if (!isPrivileged || !advanceId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${advanceId}/close`, {
        notes: notes?.trim() ? notes.trim() : undefined,
      });
      showToast("success", t("common.saved") || "تم الحفظ");
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      const msg = e?.message || t("financeAdvanceDetails.errors.closeFailed");
      setError(msg);
      showToast("error", msg);
    } finally {
      setBusy(false);
    }
  }

  async function reopen(notes?: string) {
    if (!isPrivileged || !advanceId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${advanceId}/reopen`, {
        notes: notes?.trim() ? notes.trim() : undefined,
      });
      showToast("success", t("common.saved") || "تم الحفظ");
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      const msg = e?.message || t("financeAdvanceDetails.errors.reopenFailed");
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

  const expenseColumns: DataTableColumn<any>[] = [
    {
      key: "amount",
      label: t("financeAdvanceDetails.expenses.table.amount"),
      render: (x) => <span className="font-semibold">{fmtMoney(x.amount)}</span>,
    },
    {
      key: "type",
      label: t("financeAdvanceDetails.expenses.table.type"),
      render: (x) => x.expense_type || "—",
    },
    {
      key: "status",
      label: t("financeAdvanceDetails.expenses.table.status"),
      render: (x) => <span className="text-gray-700">{norm(x.approval_status) || "—"}</span>,
    },
    {
      key: "created",
      label: t("financeAdvanceDetails.expenses.table.created"),
      render: (x) => <span className="text-gray-600">{fmtDate(x.created_at)}</span>,
    },
    {
      key: "link",
      label: t("financeAdvanceDetails.expenses.table.link"),
      headerClassName: "text-left",
      className: "text-left",
      render: (x) => (
        <Link href={`/finance/expenses/${x.id}`}>
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
              {advance?.status ? <StatusBadge status={String(advance.status)} /> : null}
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
                <Button variant="secondary">{t("financeAdvanceDetails.buttons.list") || t("common.list")}</Button>
              </Link>
              <Button variant="secondary" onClick={loadAll} disabled={loading || busy} isLoading={loading || busy}>
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

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((x) => {
            const active = tab === x.key;
            return (
              <button
                key={x.key}
                onClick={() => setTab(x.key)}
                className={[
                  "px-3 py-2 rounded-xl text-sm border transition",
                  active
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                {x.label}
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
            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <KpiCard label={t("financeAdvanceDetails.kpis.advanceAmount")} value={fmtMoney(totals.advanceAmount)} />
              <KpiCard label={t("financeAdvanceDetails.kpis.approvedUsed")} value={fmtMoney(totals.approved)} />
              <KpiCard label={t("financeAdvanceDetails.kpis.remaining")} value={fmtMoney(totals.remaining)} />
              <KpiCard label={t("financeAdvanceDetails.kpis.pending")} value={fmtMoney(totals.pending)} />
              <KpiCard label={t("financeAdvanceDetails.kpis.rejected")} value={fmtMoney(totals.rejected)} />
            </div>

            <Card title={t("financeAdvanceDetails.tabs.overview")}>
              <div className="space-y-2">
                <div className="text-xs text-gray-600">{t("financeAdvanceDetails.labels.supervisor")}</div>
                <div className="text-sm text-gray-900">
                  {advance?.users_cash_advances_supervisor?.full_name ||
                    advance?.users_cash_advances_supervisor?.email ||
                    advance?.field_supervisor_id ||
                    "—"}
                </div>

                <div className="mt-2 text-xs text-gray-600">{t("financeAdvanceDetails.labels.createdAt")}</div>
                <div className="text-sm text-gray-900">{fmtDate(advance?.created_at)}</div>

                <div className="mt-2 text-xs text-gray-600">{t("financeAdvanceDetails.labels.notes")}</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{advance?.notes || "—"}</div>
              </div>
            </Card>
          </>
        ) : tab === "expenses" ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-900">{t("financeAdvanceDetails.expenses.title")}</div>
              <Link href="/finance/expenses/new">
                <Button variant="primary">{t("financeAdvanceDetails.buttons.newExpense")}</Button>
              </Link>
            </div>

            <DataTable<any>
              title={t("financeAdvanceDetails.expenses.title")}
              subtitle={
                <span className="text-gray-600">
                  {t("financeAdvanceDetails.labels.id")}: <span className="font-mono">{shortId(advanceId)}</span>
                </span>
              }
              columns={expenseColumns}
              rows={Array.isArray(expenses) ? expenses : []}
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
                  {t("financeAdvanceDetails.actions.status")}: {st || "—"})
                </span>
              </div>

              {!isPrivileged ? (
                <div className="text-sm text-gray-600">{t("financeAdvanceDetails.actions.notAvailable")}</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {st === "OPEN" ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        openConfirm({
                          title: t("financeAdvanceDetails.actions.submitReview"),
                          description: t("financeAdvanceDetails.confirm.submitReview") || "إرسال العهدة للمراجعة؟",
                          tone: "warning",
                          action: submitReview,
                        })
                      }
                    >
                      {t("financeAdvanceDetails.actions.submitReview")}
                    </Button>
                  ) : null}

                  {st !== "CLOSED" ? (
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() =>
                        openConfirm({
                          title: t("financeAdvanceDetails.actions.close"),
                          description: t("financeAdvanceDetails.confirm.close") || "هل تريد إغلاق العهدة الآن؟",
                          tone: "info",
                          action: async () => {
                            // اختياري: لو عايز notes خليها prompt، أو هنبدّلها لمودال مستقل بعدين
                            const notes = window.prompt(t("financeAdvanceDetails.prompts.closeNotesOptional")) || "";
                            await closeAdvance(notes);
                          },
                        })
                      }
                    >
                      {t("financeAdvanceDetails.actions.close")}
                    </Button>
                  ) : null}

                  {st === "CLOSED" ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        openConfirm({
                          title: t("financeAdvanceDetails.actions.reopen"),
                          description: t("financeAdvanceDetails.confirm.reopen") || "هل تريد إعادة فتح العهدة؟",
                          tone: "warning",
                          action: async () => {
                            const notes = window.prompt(t("financeAdvanceDetails.prompts.reopenNotesOptional")) || "";
                            await reopen(notes);
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

        {/* Confirm */}
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

        <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
      </div>
    </div>
  );
}