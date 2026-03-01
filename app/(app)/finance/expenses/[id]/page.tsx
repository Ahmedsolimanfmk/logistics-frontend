// app/(app)/finance/expenses/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

// ✅ UI System (TREX)
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

// ✅ Toast + ConfirmDialog
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";

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

type TabKey = "overview" | "audit" | "actions";

export default function ExpenseDetailsPage(): React.ReactElement {
  const t = useT();
  const params = useParams();
  const router = useRouter();

  // ✅ robust id parsing
  const rawId = (params as any)?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const expenseId = typeof id === "string" && id && id !== "undefined" && id !== "null" ? id : "";

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isAccountantOrAdmin = role === "ACCOUNTANT" || role === "ADMIN";
  const isSupervisor = role === "FIELD_SUPERVISOR";

  // Tabs
  const [tab, setTab] = useState<TabKey>("overview");

  // Loading / Busy / Error
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [expense, setExpense] = useState<any | null>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [auditNote, setAuditNote] = useState<string | null>(null);

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

  // ConfirmDialog (generic)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<React.ReactNode>("تأكيد");
  const [confirmDesc, setConfirmDesc] = useState<React.ReactNode>("");
  const [confirmTone, setConfirmTone] = useState<"danger" | "warning" | "info">("warning");
  const [confirmText, setConfirmText] = useState<string>("تأكيد");
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

  // ---------- loaders ----------
  async function fetchExpenseByBestEffort(expenseId: string) {
    // 1) direct endpoint (if exists)
    try {
      const res = await api.get(`/cash/cash-expenses/${expenseId}`);
      return (res as any)?.data ?? res;
    } catch {
      // ignore
    }

    // 2) fallback scan advances -> expenses (works for ADVANCE expenses)
    try {
      const advRes = await api.get("/cash/cash-advances");
      const advData = (advRes as any)?.data ?? advRes;
      const advances = Array.isArray(advData) ? advData : (advData as any)?.items || [];

      const visibleAdvances = isSupervisor
        ? advances.filter((a: any) => a.field_supervisor_id === user?.id)
        : advances;

      const lists = await Promise.all(
        visibleAdvances.slice(0, 60).map(async (a: any) => {
          try {
            const exRes = await api.get(`/cash/cash-advances/${a.id}/expenses`);
            const exData = (exRes as any)?.data ?? exRes;
            return Array.isArray(exData) ? exData : [];
          } catch {
            return [];
          }
        })
      );

      const flat = lists.flat();
      const found = flat.find((x: any) => x.id === expenseId);
      return found || null;
    } catch {
      return null;
    }
  }

  async function fetchAudit(expenseId: string) {
    try {
      const r: any = await api.get(`/cash/cash-expenses/${expenseId}/audit`);
      const body = (r as any)?.data ?? r;
      const arr = Array.isArray(body?.audits) ? body.audits : [];
      setAudits(arr);
      setAuditNote(body?.note ? String(body.note) : null);
    } catch (e: any) {
      setAudits([]);
      setAuditNote(e?.message || t("financeExpenseDetails.errors.auditFailed"));
    }
  }

  async function loadAll() {
    if (!expenseId) return;

    setLoading(true);
    setError(null);

    try {
      const e = await fetchExpenseByBestEffort(expenseId);
      setExpense(e);
      await fetchAudit(expenseId);
    } catch (e: any) {
      setError(e?.message || t("financeExpenseDetails.errors.loadFailed"));
      setExpense(null);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!expenseId) {
      setLoading(false);
      setExpense(null);
      setAudits([]);
      setError(t("financeExpenseDetails.errors.invalidId"));
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  // ---------- derived permissions ----------
  const approvalStatus = String(expense?.approval_status || expense?.status || "").toUpperCase();
  const paymentSource = String(expense?.payment_source || "").toUpperCase();

  const canApproveReject = isAccountantOrAdmin && approvalStatus === "PENDING";
  const canReopenRejected = isAccountantOrAdmin && approvalStatus === "REJECTED";
  const canResolveAppeal = isAccountantOrAdmin && approvalStatus === "APPEALED";

  const isOwner = expense?.created_by && user?.id && expense.created_by === user.id;
  const canAppeal = isSupervisor && isOwner && approvalStatus === "REJECTED";

  // ---------- actions (wrapped with confirm) ----------
  function onApprove() {
    if (!canApproveReject) return;

    openConfirm({
      title: t("financeExpenseDetails.actions.approve"),
      description: t("financeExpenseDetails.confirm.approve") || "هل أنت متأكد من اعتماد هذا المصروف؟",
      tone: "info",
      confirmText: t("common.confirm") || "تأكيد",
      action: async () => {
        setConfirmBusy(true);
        setBusy(true);
        setError(null);
        try {
          await api.post(`/cash/cash-expenses/${expenseId}/approve`, {});
          showToast("success", t("common.saved") || t("common.success"));
          await loadAll();
          setTab("overview");
        } catch (e: any) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            t("financeExpenseDetails.errors.approveFailed");
          setError(msg);
          showToast("error", msg);
        } finally {
          setBusy(false);
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  function onReject() {
    if (!canApproveReject) return;

    const reason = window.prompt(t("financeExpenseDetails.prompts.rejectReasonRequired"));
    if (!reason || reason.trim().length < 2) return;

    openConfirm({
      title: t("financeExpenseDetails.actions.reject"),
      description: (
        <div className="space-y-2">
          <div>{t("financeExpenseDetails.confirm.reject") || "هل أنت متأكد من رفض هذا المصروف؟"}</div>
          <div className="text-xs text-slate-600">
            {t("financeExpenseDetails.labels.reason") || "السبب"}:{" "}
            <span className="font-semibold text-[rgb(var(--trex-fg))]">{reason.trim()}</span>
          </div>
        </div>
      ),
      tone: "danger",
      confirmText: t("common.confirm") || "تأكيد",
      action: async () => {
        setConfirmBusy(true);
        setBusy(true);
        setError(null);
        try {
          await api.post(`/cash/cash-expenses/${expenseId}/reject`, { reason: reason.trim() });
          showToast("success", t("common.saved") || t("common.success"));
          await loadAll();
          setTab("overview");
        } catch (e: any) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            t("financeExpenseDetails.errors.rejectFailed");
          setError(msg);
          showToast("error", msg);
        } finally {
          setBusy(false);
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  function onAppeal() {
    if (!canAppeal) return;

    const notes = window.prompt(t("financeExpenseDetails.prompts.appealReasonRequired"));
    if (!notes || notes.trim().length < 2) return;

    openConfirm({
      title: t("financeExpenseDetails.actions.appeal"),
      description: (
        <div className="space-y-2">
          <div>{t("financeExpenseDetails.confirm.appeal") || "هل تريد إرسال استئناف على هذا المصروف؟"}</div>
          <div className="text-xs text-slate-600">
            {t("financeExpenseDetails.labels.notes") || "ملاحظات"}:{" "}
            <span className="font-semibold text-[rgb(var(--trex-fg))]">{notes.trim()}</span>
          </div>
        </div>
      ),
      tone: "warning",
      confirmText: t("common.confirm") || "تأكيد",
      action: async () => {
        setConfirmBusy(true);
        setBusy(true);
        setError(null);
        try {
          await api.post(`/cash/cash-expenses/${expenseId}/appeal`, { notes: notes.trim() });
          showToast("success", t("common.saved") || t("common.success"));
          await loadAll();
          setTab("overview");
        } catch (e: any) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            t("financeExpenseDetails.errors.appealFailed");
          setError(msg);
          showToast("error", msg);
        } finally {
          setBusy(false);
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  function onReopenRejected() {
    if (!canReopenRejected) return;

    const notes = window.prompt(t("financeExpenseDetails.prompts.optionalNote")) || "";

    openConfirm({
      title: t("financeExpenseDetails.actions.reopenToPending"),
      description: t("financeExpenseDetails.confirm.reopen") || "هل تريد إعادة فتح المصروف (إلى Pending)؟",
      tone: "warning",
      confirmText: t("common.confirm") || "تأكيد",
      action: async () => {
        setConfirmBusy(true);
        setBusy(true);
        setError(null);
        try {
          await api.post(`/cash/cash-expenses/${expenseId}/reopen`, { notes: notes.trim() || undefined });
          showToast("success", t("common.saved") || t("common.success"));
          await loadAll();
          setTab("overview");
        } catch (e: any) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            t("financeExpenseDetails.errors.reopenFailed");
          setError(msg);
          showToast("error", msg);
        } finally {
          setBusy(false);
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  function onResolveAppeal(decision: "APPROVE" | "REJECT") {
    if (!canResolveAppeal) return;

    let payload: any = { decision };

    if (decision === "REJECT") {
      const reason = window.prompt(t("financeExpenseDetails.prompts.rejectReasonRequired"));
      if (!reason || reason.trim().length < 2) return;
      payload.reason = reason.trim();
    } else {
      const notes = window.prompt(t("financeExpenseDetails.prompts.optionalNote"));
      if (notes && notes.trim()) payload.notes = notes.trim();
    }

    openConfirm({
      title:
        decision === "APPROVE"
          ? t("financeExpenseDetails.actions.resolveApprove")
          : t("financeExpenseDetails.actions.resolveReject"),
      description:
        decision === "APPROVE"
          ? t("financeExpenseDetails.confirm.resolveApprove") || "هل تريد اعتماد الاستئناف؟"
          : t("financeExpenseDetails.confirm.resolveReject") || "هل تريد رفض الاستئناف؟",
      tone: decision === "APPROVE" ? "info" : "danger",
      confirmText: t("common.confirm") || "تأكيد",
      action: async () => {
        setConfirmBusy(true);
        setBusy(true);
        setError(null);
        try {
          await api.post(`/cash/cash-expenses/${expenseId}/resolve-appeal`, payload);
          showToast("success", t("common.saved") || t("common.success"));
          await loadAll();
          setTab("overview");
        } catch (e: any) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            t("financeExpenseDetails.errors.resolveAppealFailed");
          setError(msg);
          showToast("error", msg);
        } finally {
          setBusy(false);
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  const tabs = useMemo(
    () => [
      { key: "overview" as const, label: t("financeExpenseDetails.tabs.overview") },
      { key: "audit" as const, label: t("financeExpenseDetails.tabs.audit") },
      { key: "actions" as const, label: t("financeExpenseDetails.tabs.actions") },
    ],
    [t]
  );

  const fg = "text-[rgb(var(--trex-fg))]";
  const muted = "text-slate-500";

  return (
    <div className="space-y-4" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <span>{t("financeExpenseDetails.title")}</span>
              {expense?.approval_status || expense?.status ? (
                <StatusBadge status={String(expense?.approval_status || expense?.status)} />
              ) : null}
            </div>
          }
          subtitle={
            <div className={cn("text-sm", muted)}>
              {t("financeExpenseDetails.meta.id")}:{" "}
              <span className={cn("font-mono", fg)}>{expenseId || "—"}</span>
              {paymentSource ? (
                <>
                  {" "}
                  — {t("financeExpenseDetails.meta.source")}:{" "}
                  <span className={cn("font-semibold", fg)}>{paymentSource}</span>
                </>
              ) : null}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => router.back()}>
                {t("common.back")}
              </Button>
              <Link href="/finance/expenses">
                <Button variant="secondary">{t("common.list")}</Button>
              </Link>
              <Button
                variant="secondary"
                onClick={loadAll}
                disabled={loading || busy}
                isLoading={loading || busy}
              >
                {t("common.refresh")}
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
          {tabs.map((tt) => (
            <button
              key={tt.key}
              onClick={() => setTab(tt.key)}
              className={cn(
                "px-3 py-2 rounded-xl text-sm border transition",
                tab === tt.key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-[rgba(var(--trex-surface),0.7)] text-slate-700 border-black/10 hover:bg-black/[0.03]"
              )}
            >
              {tt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <Card>
            <div className={cn("text-sm", muted)}>{t("common.loading")}</div>
          </Card>
        ) : tab === "overview" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <div className="text-xs text-slate-500">{t("financeExpenseDetails.overview.amount")}</div>
                <div className={cn("text-lg font-semibold mt-1", fg)}>{fmtMoney(expense?.amount)}</div>
              </Card>

              <Card>
                <div className="text-xs text-slate-500">{t("financeExpenseDetails.overview.type")}</div>
                <div className={cn("text-sm mt-1", fg)}>{expense?.expense_type || "—"}</div>
              </Card>

              <Card>
                <div className="text-xs text-slate-500">{t("financeExpenseDetails.overview.createdAt")}</div>
                <div className={cn("text-sm mt-1", fg)}>{fmtDate(expense?.created_at)}</div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card title={t("financeExpenseDetails.overview.creator")}>
                <div className={cn("text-sm", fg)}>
                  {expense?.users_cash_expenses_created_byTousers?.full_name ||
                    expense?.users_cash_expenses_created_byTousers?.email ||
                    expense?.created_by ||
                    "—"}
                </div>

                <div className="mt-3 text-xs text-slate-500">{t("financeExpenseDetails.overview.notes")}</div>
                <div className={cn("text-sm mt-1 whitespace-pre-wrap", fg)}>{expense?.notes || "—"}</div>
              </Card>

              <Card title={t("financeExpenseDetails.overview.context")}>
                <div className={cn("text-sm", fg)}>
                  {t("financeExpenseDetails.overview.trip")}:{" "}
                  <span className="font-mono text-slate-600">{expense?.trip_id || "—"}</span>
                </div>
                <div className={cn("text-sm mt-1", fg)}>
                  {t("financeExpenseDetails.overview.vehicle")}:{" "}
                  <span className="font-mono text-slate-600">{expense?.vehicle_id || "—"}</span>
                </div>
                <div className={cn("text-sm mt-1", fg)}>
                  {t("financeExpenseDetails.overview.workOrder")}:{" "}
                  <span className="font-mono text-slate-600">
                    {expense?.maintenance_work_order_id || "—"}
                  </span>
                </div>

                {paymentSource === "COMPANY" ? (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs text-slate-500">{t("financeExpenseDetails.overview.companyFields")}</div>

                    <div className={cn("text-sm", fg)}>
                      {t("financeExpenseDetails.overview.vendor")}:{" "}
                      <span className="text-slate-700">{expense?.vendor_name || "—"}</span>
                    </div>
                    <div className={cn("text-sm", fg)}>
                      {t("financeExpenseDetails.overview.invoiceNo")}:{" "}
                      <span className="text-slate-700">{expense?.invoice_no || "—"}</span>
                    </div>
                    <div className={cn("text-sm", fg)}>
                      {t("financeExpenseDetails.overview.invoiceDate")}:{" "}
                      <span className="text-slate-700">{fmtDate(expense?.invoice_date || null)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs text-slate-500">{t("financeExpenseDetails.overview.advance")}</div>
                    <div className={cn("text-sm", fg)}>
                      {t("financeExpenseDetails.overview.cashAdvanceId")}:{" "}
                      <span className="font-mono text-slate-600">{expense?.cash_advance_id || "—"}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            <Card title={t("financeExpenseDetails.overview.resolution")}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-slate-500">{t("financeExpenseDetails.overview.approvedAt")}</div>
                  <div className={cn("text-sm mt-1", fg)}>{fmtDate(expense?.approved_at || null)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t("financeExpenseDetails.overview.rejectedAt")}</div>
                  <div className={cn("text-sm mt-1", fg)}>{fmtDate(expense?.rejected_at || null)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t("financeExpenseDetails.overview.resolvedAt")}</div>
                  <div className={cn("text-sm mt-1", fg)}>{fmtDate(expense?.resolved_at || null)}</div>
                </div>
              </div>

              {expense?.rejection_reason ? (
                <div className="mt-3 text-sm text-red-600">
                  {t("financeExpenseDetails.overview.rejectionReason")}:{" "}
                  <span className="font-semibold">{String(expense.rejection_reason)}</span>
                </div>
              ) : null}
            </Card>
          </div>
        ) : tab === "audit" ? (
          <Card
            title={t("financeExpenseDetails.audit.title")}
            right={auditNote ? <span className="text-xs text-slate-500">{auditNote}</span> : null}
          >
            {audits.length === 0 ? (
              <div className={cn("text-sm", muted)}>{t("financeExpenseDetails.audit.empty")}</div>
            ) : (
              <div className="space-y-2">
                {audits.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className={cn("text-sm font-semibold", fg)}>{String(a.action || "ACTION")}</div>
                      <div className="text-xs text-slate-500">{fmtDate(a.created_at)}</div>
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {t("financeExpenseDetails.audit.actor")}:{" "}
                      <span className={cn("font-mono", fg)}>{a.actor_id || "—"}</span>
                    </div>

                    {a.notes ? (
                      <div className={cn("mt-2 text-sm whitespace-pre-wrap", fg)}>{a.notes}</div>
                    ) : null}

                    {a.before || a.after ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-900">
                          {t("financeExpenseDetails.audit.showDiff")}
                        </summary>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <pre className="text-xs overflow-auto rounded-2xl border border-black/10 bg-black/[0.03] p-2">
                            {a.before || "—"}
                          </pre>
                          <pre className="text-xs overflow-auto rounded-2xl border border-black/10 bg-black/[0.03] p-2">
                            {a.after || "—"}
                          </pre>
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card title={t("financeExpenseDetails.actions.title")}>
            <div className={cn("text-sm", fg)}>
              <span className="font-semibold">{t("financeExpenseDetails.actions.title")}</span>{" "}
              <span className="text-xs text-slate-500">
                ({t("financeExpenseDetails.actions.metaRole")}: {role || "—"} /{" "}
                {t("financeExpenseDetails.actions.metaStatus")}: {approvalStatus || "—"})
              </span>
            </div>

            <div className="mt-3 rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] p-3 space-y-2">
              {canApproveReject ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={onApprove} disabled={busy}>
                    {t("financeExpenseDetails.actions.approve")}
                  </Button>
                  <Button variant="danger" onClick={onReject} disabled={busy}>
                    {t("financeExpenseDetails.actions.reject")}
                  </Button>
                </div>
              ) : (
                <div className={cn("text-sm", muted)}>{t("financeExpenseDetails.actions.none")}</div>
              )}

              {canAppeal ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={onAppeal} disabled={busy}>
                    {t("financeExpenseDetails.actions.appeal")}
                  </Button>
                </div>
              ) : null}

              {canResolveAppeal ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => onResolveAppeal("APPROVE")} disabled={busy}>
                    {t("financeExpenseDetails.actions.resolveApprove")}
                  </Button>
                  <Button variant="danger" onClick={() => onResolveAppeal("REJECT")} disabled={busy}>
                    {t("financeExpenseDetails.actions.resolveReject")}
                  </Button>
                </div>
              ) : null}

              {canReopenRejected ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={onReopenRejected} disabled={busy}>
                    {t("financeExpenseDetails.actions.reopenToPending")}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="mt-3 text-xs text-slate-500">{t("financeExpenseDetails.actions.hint")}</div>
          </Card>
        )}
      </div>

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
          await confirmAction();
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