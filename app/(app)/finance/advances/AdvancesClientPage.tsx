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

/* =========================
   Issue Advance Modal
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
        const list = Array.isArray(body)
          ? body
          : Array.isArray(body?.items)
          ? body.items
          : [];

        const sup = list.filter(
          (u: any) =>
            String(u?.role || "").toUpperCase() === "FIELD_SUPERVISOR" &&
            u?.is_active !== false
        );

        setSupervisors(sup);
      } catch (e: any) {
        showToast(
          "error",
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load supervisors"
        );
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
        e?.response?.data?.message ||
          e?.message ||
          t("financeAdvances.errors.issueFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-slate-900 text-white border border-white/10 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {t("financeAdvances.modal.issueTitle")}
          </h3>
          <Button variant="secondary" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm">
            {t("financeAdvances.modal.supervisor")}
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
            >
              <option value="">
                {t("financeAdvances.modal.selectSupervisor")}
              </option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email || shortId(s.id)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            {t("financeAdvances.modal.amount")}
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              placeholder={t("financeAdvances.modal.amountPh")}
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>

          <Button
            variant="primary"
            onClick={submit}
            disabled={!canSubmit || loading}
            isLoading={loading}
          >
            {loading
              ? t("common.saving")
              : t("financeAdvances.actions.issue")}
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
  const pageSize = Math.min(
    Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 1),
    200
  );
  const q = sp.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
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
      const list = Array.isArray(data)
        ? data
        : (data as any)?.items || [];
      const tTotal = Array.isArray(data)
        ? list.length
        : Number((data as any)?.total || 0);

      setItems(list);
      setTotal(tTotal);

      const sumData = (summaryRes as any)?.data ?? summaryRes;
      setSummary(sumData?.totals || null);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t("financeAdvances.errors.loadFailed");

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
    const sumAmount = rows.reduce(
      (acc, x) => acc + Number(x?.amount || 0),
      0
    );

    return {
      sumAmount,
      openCount: rows.filter((x) =>
        ["OPEN", "IN_REVIEW", "PENDING"].includes(
          String(x.status).toUpperCase()
        )
      ).length,
      settledCount: rows.filter((x) =>
        ["SETTLED", "CLOSED"].includes(
          String(x.status).toUpperCase()
        )
      ).length,
      canceledCount: rows.filter((x) =>
        ["CANCELED", "REJECTED"].includes(
          String(x.status).toUpperCase()
        )
      ).length,
    };
  }, [items, summary]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">

        <PageHeader
          title={t("financeAdvances.title")}
          subtitle={
            <>
              {canSeeAll
                ? t("financeAdvances.meta.showingAll")
                : t("financeAdvances.meta.showingMine")}
              {" — "}
              {t("common.role")}:{" "}
              <span className="text-slate-200">{role || "—"}</span>
            </>
          }
          actions={
            <>
              <Link href="/finance">
                <Button variant="secondary">
                  ← {t("sidebar.finance")}
                </Button>
              </Link>

              {canIssue && (
                <Button
                  variant="primary"
                  onClick={() => setIssueOpen(true)}
                >
                  + {t("financeAdvances.actions.issue")}
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={load}
                disabled={loading}
                isLoading={loading}
              >
                {loading
                  ? t("common.loading")
                  : t("common.refresh")}
              </Button>
            </>
          }
        />

        {/* KPI */}
        {!loading && !err && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label={t("financeAdvances.kpi.totalAmount")}
              value={fmtMoney(kpi.sumAmount)}
            />
            <KpiCard
              label={t("financeAdvances.kpi.open")}
              value={kpi.openCount}
            />
            <KpiCard
              label={t("financeAdvances.kpi.settled")}
              value={kpi.settledCount}
            />
            <KpiCard
              label={t("financeAdvances.kpi.canceled")}
              value={kpi.canceledCount}
            />
          </div>
        )}

      </div>

      <IssueAdvanceModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onIssued={load}
        showToast={showToast}
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