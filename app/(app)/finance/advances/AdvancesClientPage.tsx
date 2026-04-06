"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { TabsBar } from "@/src/components/ui/TabsBar";
import { Card } from "@/src/components/ui/Card";

import { cashAdvancesService } from "@/src/services/cash-advances.service";
import type {
  CashAdvance,
  CashAdvanceStatus,
  CashAdvanceSummaryTotals,
} from "@/src/types/cash-advances.types";

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

function LocalStatusBadge({ status }: { status?: string | null }) {
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

type TabKey = CashAdvanceStatus;

export default function AdvancesClientPage(): React.ReactElement {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);

  const role = roleUpper(user?.role);
  const canManage = role === "ADMIN" || role === "ACCOUNTANT";

  const status = (sp.get("status") || "OPEN").toUpperCase() as TabKey;
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 1), 200);
  const q = sp.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<CashAdvance[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<CashAdvanceSummaryTotals | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [newAmount, setNewAmount] = useState("");

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

    router.push(`/finance/advances?${params.toString()}`);
  };

  const qsKey = useMemo(() => `${status}|${page}|${pageSize}|${q}`, [status, page, pageSize, q]);

  async function load() {
    if (token === null || !token) return;

    setLoading(true);
    setErr(null);

    try {
      const [listRes, summaryRes] = await Promise.all([
        cashAdvancesService.list({
          status,
          page,
          page_size: pageSize,
          q: q || undefined,
        }),
        cashAdvancesService.getSummary({
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
        e?.response?.data?.message || e?.message || t("financeAdvances.errors.loadFailed");
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

  async function submitCreate() {
    if (!canManage) return;

    const amount = Number(newAmount);
    if (!newSupervisorId.trim()) {
      showToast("error", t("financeAdvances.errors.supervisorRequired") || "Supervisor is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("error", t("financeAdvances.errors.amountInvalid") || "Amount must be greater than 0");
      return;
    }

    setBusy(true);
    try {
      await cashAdvancesService.create({
        field_supervisor_id: newSupervisorId.trim(),
        amount,
      });

      showToast("success", t("financeAdvances.toast.created") || "Created");
      setCreateOpen(false);
      setNewSupervisorId("");
      setNewAmount("");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || t("financeAdvances.errors.createFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "OPEN", label: t("financeAdvances.tabs.OPEN") || "OPEN" },
    { key: "SETTLED", label: t("financeAdvances.tabs.SETTLED") || "SETTLED" },
    { key: "CANCELLED", label: t("financeAdvances.tabs.CANCELLED") || "CANCELLED" },
    { key: "ALL", label: t("financeAdvances.tabs.ALL") || "ALL" },
  ];

  const kpi = useMemo(() => {
    if (summary) {
      return {
        sumAmount: Number(summary.sumAmount || 0),
        countAll: Number(summary.countAll || 0),
        openCount: Number(summary.openCount || 0),
        settledCount: Number(summary.settledCount || 0),
        canceledCount: Number(summary.canceledCount || 0),
      };
    }

    return {
      sumAmount: items.reduce((acc, x) => acc + Number(x.amount || 0), 0),
      countAll: items.length,
      openCount: items.filter((x) => norm(x.status) === "OPEN").length,
      settledCount: items.filter((x) => norm(x.status) === "SETTLED").length,
      canceledCount: items.filter((x) => ["CANCELLED", "CANCELED"].includes(norm(x.status))).length,
    };
  }, [items, summary]);

  const columns: DataTableColumn<CashAdvance>[] = useMemo(
    () => [
      {
        key: "id",
        label: t("financeAdvances.table.id") || "ID",
        render: (x) => <span className="font-mono text-xs">{shortId(x.id)}</span>,
      },
      {
        key: "supervisor",
        label: t("financeAdvances.table.supervisor") || "Supervisor",
        render: (x) =>
          x.users_cash_advances_field_supervisor_idTousers?.full_name ||
          x.users_cash_advances_field_supervisor_idTousers?.email ||
          x.field_supervisor_id ||
          "—",
      },
      {
        key: "amount",
        label: t("financeAdvances.table.amount") || "Amount",
        render: (x) => <span className="font-semibold">{fmtMoney(x.amount)}</span>,
      },
      {
        key: "status",
        label: t("financeAdvances.table.status") || "Status",
        render: (x) => <LocalStatusBadge status={x.status} />,
      },
      {
        key: "created_at",
        label: t("financeAdvances.table.created") || "Created",
        render: (x) => <span className="text-slate-600">{fmtDate(x.created_at)}</span>,
      },
      {
        key: "actions",
        label: t("financeAdvances.table.actions") || "Actions",
        render: (x) => (
          <div className="flex flex-wrap gap-2">
            <Link href={`/finance/advances/${x.id}`}>
              <Button variant="secondary">{t("common.view")}</Button>
            </Link>
          </div>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title={t("financeAdvances.title") || "Cash Advances"}
        subtitle={
          <span className="text-slate-500">
            {t("common.role")}:{" "}
            <span className="font-semibold text-[rgb(var(--trex-fg))]">{role || "—"}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/finance">
              <Button variant="secondary">{t("sidebar.finance")}</Button>
            </Link>
            {canManage ? (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                {t("financeAdvances.actions.new") || t("common.add") || "Add"}
              </Button>
            ) : null}
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
                  placeholder={t("financeAdvances.filters.searchPlaceholder") || "Search"}
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
                    setParam("status", "OPEN");
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label={t("financeAdvances.kpi.totalAmount") || "Total Amount"} value={fmtMoney(kpi.sumAmount)} />
          <KpiCard label={t("financeAdvances.kpi.countAll") || "Count All"} value={kpi.countAll} />
          <KpiCard label={t("financeAdvances.kpi.openCount") || "Open"} value={kpi.openCount} />
          <KpiCard label={t("financeAdvances.kpi.settledCount") || "Settled"} value={kpi.settledCount} />
        </div>
      ) : null}

      {err ? (
        <Card className="border-red-500/20">
          <div className="text-sm text-red-600">⚠️ {err}</div>
        </Card>
      ) : null}

      <DataTable<CashAdvance>
        title={t("financeAdvances.title") || "Cash Advances"}
        columns={columns}
        rows={items}
        loading={loading}
        total={total}
        page={page}
        pages={totalPages}
        onPrev={page <= 1 ? undefined : () => setParam("page", String(page - 1))}
        onNext={page >= totalPages ? undefined : () => setParam("page", String(page + 1))}
        emptyTitle={t("financeAdvances.empty") || "No advances"}
        emptyHint={t("common.tryAdjustFilters") || "جرّب تغيير الفلاتر أو البحث."}
        onRowClick={(row) => router.push(`/finance/advances/${row.id}`)}
      />

      <ConfirmDialog
        open={createOpen}
        title={t("financeAdvances.actions.new") || "Create advance"}
        description={
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-600 mb-1">
                {t("financeAdvances.fields.supervisorId") || "Field supervisor ID"}
              </div>
              <input
                value={newSupervisorId}
                onChange={(e) => setNewSupervisorId(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
                placeholder="uuid"
                disabled={busy}
              />
            </div>

            <div>
              <div className="text-sm text-slate-600 mb-1">
                {t("financeAdvances.fields.amount") || "Amount"}
              </div>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
                placeholder="0"
                disabled={busy}
              />
            </div>
          </div>
        }
        confirmText={t("common.save") || "Save"}
        cancelText={t("common.cancel") || "Cancel"}
        tone="info"
        isLoading={busy}
        dir="rtl"
        onClose={() => {
          if (busy) return;
          setCreateOpen(false);
        }}
        onConfirm={submitCreate}
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