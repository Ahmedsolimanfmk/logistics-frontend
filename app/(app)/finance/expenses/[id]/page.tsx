// app/(app)/finance/expenses/[id]/page.tsx
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

function StatusBadge({ status }: { status: string }) {
  const st = String(status || "").toUpperCase();
  const cls =
    st === "APPROVED" || st === "REAPPROVED"
      ? "bg-green-50 text-green-700 border-green-200"
      : st === "REJECTED"
      ? "bg-red-50 text-red-700 border-red-200"
      : st === "APPEALED"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : st === "PENDING"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs border", cls)}>
      {st || "—"}
    </span>
  );
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

      const visibleAdvances = isSupervisor ? advances.filter((a: any) => a.field_supervisor_id === user?.id) : advances;

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
          const msg = e?.response?.data?.message || e?.message || t("financeExpenseDetails.errors.approveFailed");
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
          <div className="text-xs text-gray-600">
            {t("financeExpenseDetails.labels.reason") || "السبب"}:{" "}
            <span className="font-semibold text-gray-900">{reason.trim()}</span>
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
          const msg = e?.response?.data?.message || e?.message || t("financeExpenseDetails.errors.rejectFailed");
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
          <div className="text-xs text-gray-600">
            {t("financeExpenseDetails.labels.notes") || "ملاحظات"}:{" "}
            <span className="font-semibold text-gray-900">{notes.trim()}</span>
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
          const msg = e?.response?.data?.message || e?.message || t("financeExpenseDetails.errors.appealFailed");
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
          const msg = e?.response?.data?.message || e?.message || t("financeExpenseDetails.errors.reopenFailed");
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

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
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
            <div className="text-sm text-gray-600">
              {t("financeExpenseDetails.meta.id")}:{" "}
              <span className="font-mono text-gray-900">{expenseId || "—"}</span>
              {paymentSource ? (
                <>
                  {" "}
                  — {t("financeExpenseDetails.meta.source")}:{" "}
                  <span className="font-semibold text-gray-900">{paymentSource}</span>
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
              <Button variant="secondary" onClick={loadAll} disabled={loading || busy} isLoading={loading || busy}>
                {t("common.refresh")}
              </Button>
            </div>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            ⚠️ {error}
          </div>
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
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              {tt.label}
            </button>
          ))}
        </div>

        {/* Content Card */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="p-4">
            {loading ? (
              <div className="text-sm text-gray-600">{t("common.loading")}</div>
            ) : tab === "overview" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.amount")}</div>
                    <div className="text-lg font-semibold text-gray-900">{fmtMoney(expense?.amount)}</div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.type")}</div>
                    <div className="text-sm text-gray-900">{expense?.expense_type || "—"}</div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.createdAt")}</div>
                    <div className="text-sm text-gray-900">{fmtDate(expense?.created_at)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                    <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.creator")}</div>
                    <div className="text-sm text-gray-900">
                      {expense?.users_cash_expenses_created_byTousers?.full_name ||
                        expense?.users_cash_expenses_created_byTousers?.email ||
                        expense?.created_by ||
                        "—"}
                    </div>

                    <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.notes")}</div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">{expense?.notes || "—"}</div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-1">
                    <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.context")}</div>

                    <div className="text-sm text-gray-900">
                      {t("financeExpenseDetails.overview.trip")}:{" "}
                      <span className="font-mono text-gray-700">{expense?.trip_id || "—"}</span>
                    </div>
                    <div className="text-sm text-gray-900">
                      {t("financeExpenseDetails.overview.vehicle")}:{" "}
                      <span className="font-mono text-gray-700">{expense?.vehicle_id || "—"}</span>
                    </div>
                    <div className="text-sm text-gray-900">
                      {t("financeExpenseDetails.overview.workOrder")}:{" "}
                      <span className="font-mono text-gray-700">{expense?.maintenance_work_order_id || "—"}</span>
                    </div>

                    {paymentSource === "COMPANY" ? (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.companyFields")}</div>

                        <div className="text-sm text-gray-900">
                          {t("financeExpenseDetails.overview.vendor")}:{" "}
                          <span className="text-gray-700">{expense?.vendor_name || "—"}</span>
                        </div>
                        <div className="text-sm text-gray-900">
                          {t("financeExpenseDetails.overview.invoiceNo")}:{" "}
                          <span className="text-gray-700">{expense?.invoice_no || "—"}</span>
                        </div>
                        <div className="text-sm text-gray-900">
                          {t("financeExpenseDetails.overview.invoiceDate")}:{" "}
                          <span className="text-gray-700">{fmtDate(expense?.invoice_date || null)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.advance")}</div>
                        <div className="text-sm text-gray-900">
                          {t("financeExpenseDetails.overview.cashAdvanceId")}:{" "}
                          <span className="font-mono text-gray-700">{expense?.cash_advance_id || "—"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1">
                  <div className="text-xs text-gray-600">{t("financeExpenseDetails.overview.resolution")}</div>

                  <div className="text-sm text-gray-900">
                    {t("financeExpenseDetails.overview.approvedAt")}:{" "}
                    <span className="text-gray-700">{fmtDate(expense?.approved_at || null)}</span>
                  </div>
                  <div className="text-sm text-gray-900">
                    {t("financeExpenseDetails.overview.rejectedAt")}:{" "}
                    <span className="text-gray-700">{fmtDate(expense?.rejected_at || null)}</span>
                  </div>
                  <div className="text-sm text-gray-900">
                    {t("financeExpenseDetails.overview.resolvedAt")}:{" "}
                    <span className="text-gray-700">{fmtDate(expense?.resolved_at || null)}</span>
                  </div>

                  {expense?.rejection_reason ? (
                    <div className="mt-2 text-sm text-red-700">
                      {t("financeExpenseDetails.overview.rejectionReason")}:{" "}
                      <span className="font-semibold">{String(expense.rejection_reason)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : tab === "audit" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {t("financeExpenseDetails.audit.title")}
                  </div>
                  {auditNote ? <div className="text-xs text-gray-600">{auditNote}</div> : null}
                </div>

                {audits.length === 0 ? (
                  <div className="text-sm text-gray-600">{t("financeExpenseDetails.audit.empty")}</div>
                ) : (
                  <div className="space-y-2">
                    {audits.map((a) => (
                      <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-gray-900">{String(a.action || "ACTION")}</div>
                          <div className="text-xs text-gray-600">{fmtDate(a.created_at)}</div>
                        </div>

                        <div className="mt-1 text-xs text-gray-600">
                          {t("financeExpenseDetails.audit.actor")}:{" "}
                          <span className="font-mono text-gray-900">{a.actor_id || "—"}</span>
                        </div>

                        {a.notes ? (
                          <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">{a.notes}</div>
                        ) : null}

                        {a.before || a.after ? (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-700 hover:text-gray-900">
                              {t("financeExpenseDetails.audit.showDiff")}
                            </summary>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                              <pre className="text-xs overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
                                {a.before || "—"}
                              </pre>
                              <pre className="text-xs overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
                                {a.after || "—"}
                              </pre>
                            </div>
                          </details>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // actions tab
              <div className="space-y-3">
                <div className="text-sm text-gray-900">
                  <span className="font-semibold">{t("financeExpenseDetails.actions.title")}</span>{" "}
                  <span className="text-xs text-gray-600">
                    ({t("financeExpenseDetails.actions.metaRole")}: {role || "—"} /{" "}
                    {t("financeExpenseDetails.actions.metaStatus")}: {approvalStatus || "—"})
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
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
                    <div className="text-sm text-gray-600">{t("financeExpenseDetails.actions.none")}</div>
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

                <div className="text-xs text-gray-600">{t("financeExpenseDetails.actions.hint")}</div>
              </div>
            )}
          </div>
        </div>
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

      <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
    </div>
  );
}