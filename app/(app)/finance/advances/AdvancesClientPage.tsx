"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
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

function StatusBadge({ s }: { s: string }) {
  const st = String(s || "").toUpperCase();
  const cls =
    st === "OPEN"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
      : st === "IN_REVIEW"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
      : st === "CLOSED"
      ? "bg-slate-500/15 text-slate-200 border-white/10"
      : "bg-white/5 text-slate-200 border-white/10";
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>
      {st || "—"}
    </span>
  );
}

type TabKey = "overview" | "expenses" | "actions";

export default function AdvanceDetailsPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const rawId = (params as any)?.id;
const id = Array.isArray(rawId) ? rawId[0] : rawId;
const safeId = typeof id === "string" ? id : "";
const advanceId = safeId && safeId !== "undefined" && safeId !== "null" ? safeId : "";


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

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [aRes, exRes] = await Promise.all([
  api.get(`/cash/cash-advances/${advanceId}`),
  api
    .get(`/cash/cash-advances/${advanceId}/expenses`)
    .then((r) => r)
    .catch(() => ({ data: [] })),
]);


      const a = (aRes as any)?.data ?? aRes;
      const ex = (exRes as any)?.data ?? exRes;

      setAdvance(a);
      setExpenses(Array.isArray(ex) ? ex : []);
    } catch (e: any) {
      setError(e?.message || t("financeAdvanceDetails.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  if (!advanceId) {
    setLoading(false);
    setError(t("financeAdvanceDetails.errors.invalidId"));
    return;
  }
  loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [advanceId]);


  // computed totals
  const totals = useMemo(() => {
    const approved = expenses
      .filter((x) => String(x.approval_status || "").toUpperCase() === "APPROVED")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const pending = expenses
      .filter((x) => String(x.approval_status || "").toUpperCase() === "PENDING")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const rejected = expenses
      .filter((x) => String(x.approval_status || "").toUpperCase() === "REJECTED")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const advanceAmount = Number(advance?.amount || 0);
    const remaining = advanceAmount - approved;

    return { approved, pending, rejected, advanceAmount, remaining };
  }, [expenses, advance?.amount]);

  // security: supervisor can only see his advance (soft check)
  useEffect(() => {
    if (!advance || !isSupervisor) return;
    if (advance.field_supervisor_id && advance.field_supervisor_id !== user?.id) {
      setError(t("financeAdvanceDetails.errors.forbiddenNotYours"));
    }
  }, [advance, isSupervisor, user?.id, t]);

  async function submitReview() {
    if (!isPrivileged) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/submit-review`, {});
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e?.message || t("financeAdvanceDetails.errors.submitReviewFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function closeAdvance() {
    if (!isPrivileged) return;
    const notes = window.prompt(t("financeAdvanceDetails.prompts.closeNotesOptional")) || "";
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/close`, {
        notes: notes.trim() || undefined,
      });
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e?.message || t("financeAdvanceDetails.errors.closeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    if (!isPrivileged) return;
    const notes = window.prompt(t("financeAdvanceDetails.prompts.reopenNotesOptional")) || "";
    setBusy(true);
    setError(null);
    try {
      await api.post(`/cash/cash-advances/${id}/reopen`, {
        notes: notes.trim() || undefined,
      });
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e?.message || t("financeAdvanceDetails.errors.reopenFailed"));
    } finally {
      setBusy(false);
    }
  }

  const st = String(advance?.status || "").toUpperCase();

  const tabs = [
    { key: "overview" as const, label: t("financeAdvanceDetails.tabs.overview") },
    { key: "expenses" as const, label: t("financeAdvanceDetails.tabs.expenses") },
    { key: "actions" as const, label: t("financeAdvanceDetails.tabs.actions") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("financeAdvanceDetails.title")}</h1>
            {advance?.status ? <StatusBadge s={advance.status} /> : null}
          </div>
          <div className="text-xs text-slate-400">
            {t("financeAdvanceDetails.labels.id")}:{" "}
            <span className="text-slate-200">{id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {t("financeAdvanceDetails.buttons.back")}
          </button>
          <Link
            href="/finance/advances"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {t("financeAdvanceDetails.buttons.list")}
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm border transition",
              tab === x.key
                ? "bg-white/10 border-white/10 text-white"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
        {loading ? (
          <div className="text-sm text-slate-300">{t("common.loading")}</div>
        ) : tab === "overview" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("financeAdvanceDetails.kpis.advanceAmount")}</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.advanceAmount)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("financeAdvanceDetails.kpis.approvedUsed")}</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.approved)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("financeAdvanceDetails.kpis.remaining")}</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.remaining)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("financeAdvanceDetails.kpis.pending")}</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.pending)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("financeAdvanceDetails.kpis.rejected")}</div>
                <div className="text-lg font-semibold">{fmtMoney(totals.rejected)}</div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
              <div className="text-xs text-slate-400">{t("financeAdvanceDetails.labels.supervisor")}</div>
              <div className="text-sm text-slate-200">
                {advance?.users_cash_advances_supervisor?.full_name ||
                  advance?.users_cash_advances_supervisor?.email ||
                  advance?.field_supervisor_id ||
                  "—"}
              </div>

              <div className="mt-2 text-xs text-slate-400">{t("financeAdvanceDetails.labels.createdAt")}</div>
              <div className="text-sm text-slate-200">{fmtDate(advance?.created_at)}</div>

              <div className="mt-2 text-xs text-slate-400">{t("financeAdvanceDetails.labels.notes")}</div>
              <div className="text-sm text-slate-200 whitespace-pre-wrap">{advance?.notes || "—"}</div>
            </div>
          </div>
        ) : tab === "expenses" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200">{t("financeAdvanceDetails.expenses.title")}</div>
              <Link
                href="/finance/expenses/new"
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm"
              >
                {t("financeAdvanceDetails.buttons.newExpense")}
              </Link>
            </div>

            {expenses.length === 0 ? (
              <div className="text-sm text-slate-300">{t("financeAdvanceDetails.expenses.empty")}</div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-400 bg-slate-950 border-b border-white/10">
                  <div className="col-span-2">{t("financeAdvanceDetails.expenses.table.amount")}</div>
                  <div className="col-span-3">{t("financeAdvanceDetails.expenses.table.type")}</div>
                  <div className="col-span-3">{t("financeAdvanceDetails.expenses.table.status")}</div>
                  <div className="col-span-2">{t("financeAdvanceDetails.expenses.table.created")}</div>
                  <div className="col-span-2 text-right">{t("financeAdvanceDetails.expenses.table.link")}</div>
                </div>

                {expenses.map((x) => (
                  <div
                    key={x.id}
                    className="grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-white/10 hover:bg-white/5"
                  >
                    <div className="col-span-2 font-medium">{fmtMoney(x.amount)}</div>
                    <div className="col-span-3">{x.expense_type || "—"}</div>
                    <div className="col-span-3">
                      <span className="text-slate-200">{String(x.approval_status || "").toUpperCase()}</span>
                    </div>
                    <div className="col-span-2 text-slate-300">{fmtDate(x.created_at)}</div>
                    <div className="col-span-2 flex justify-end">
                      <Link
                        href={`/finance/expenses/${x.id}`}
                        className="px-2 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                      >
                        {t("common.view")}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-slate-200">
              {t("financeAdvanceDetails.actions.title")}{" "}
              <span className="text-xs text-slate-400">
                ({t("financeAdvanceDetails.actions.role")}: {role || "—"} /{" "}
                {t("financeAdvanceDetails.actions.status")}: {st || "—"})
              </span>
            </div>

            {!isPrivileged ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                {t("financeAdvanceDetails.actions.notAvailable")}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                {st === "OPEN" ? (
                  <button
                    disabled={busy}
                    onClick={submitReview}
                    className="px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-sm disabled:opacity-50"
                  >
                    {t("financeAdvanceDetails.actions.submitReview")}
                  </button>
                ) : null}

                {st !== "CLOSED" ? (
                  <button
                    disabled={busy}
                    onClick={closeAdvance}
                    className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm disabled:opacity-50"
                  >
                    {t("financeAdvanceDetails.actions.close")}
                  </button>
                ) : null}

                {st === "CLOSED" ? (
                  <button
                    disabled={busy}
                    onClick={reopen}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/10 hover:bg-white/15 text-sm disabled:opacity-50"
                  >
                    {t("financeAdvanceDetails.actions.reopen")}
                  </button>
                ) : null}

                <button
                  disabled={busy}
                  onClick={loadAll}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
                >
                  {t("financeAdvanceDetails.buttons.refresh")}
                </button>
              </div>
            )}

            <div className="text-xs text-slate-400">{t("financeAdvanceDetails.hints.endpoints")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
