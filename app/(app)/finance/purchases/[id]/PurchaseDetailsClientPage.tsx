"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Card } from "@/src/components/ui/Card";
import { TabsBar } from "@/src/components/ui/TabsBar";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/Toast";

import { receiptsService } from "@/src/services/receipts.service";
import type { InventoryReceipt, ReceiptStatus } from "@/src/types/receipts.types";

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

function receiptStatus(receipt: InventoryReceipt): string {
  return String(receipt.status || "").toUpperCase();
}

export default function PurchasesClientPage(): React.ReactElement {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);
  const canPost = role === "ADMIN" || role === "ACCOUNTANT";

  const status = (sp.get("status") || "ALL").toUpperCase() as ReceiptStatus;
  const q = sp.get("q") || "";
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 10), 200);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);

    if (key !== "page") params.set("page", "1");
    router.push(`/finance/purchases?${params.toString()}`);
  };

  const qsKey = useMemo(() => `${status}|${q}|${page}|${pageSize}`, [status, q, page, pageSize]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<InventoryReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [allRowsForKpi, setAllRowsForKpi] = useState<InventoryReceipt[]>([]);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<React.ReactNode>("");
  const [confirmDesc, setConfirmDesc] = useState<React.ReactNode>("");
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void> | void)>(null);

  function openConfirm(opts: {
    title: React.ReactNode;
    description?: React.ReactNode;
    action: () => Promise<void> | void;
  }) {
    setConfirmTitle(opts.title);
    setConfirmDesc(opts.description ?? "");
    setConfirmAction(() => opts.action);
    setConfirmOpen(true);
  }

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [pagedResult, fullResult] = await Promise.all([
        receiptsService.list({
          status,
          q,
          page,
          page_size: pageSize,
        }),
        receiptsService.listAll({
          status,
          q,
        }),
      ]);

      setRows(pagedResult.items);
      setTotal(pagedResult.total);
      setAllRowsForKpi(fullResult);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || t("financePurchases.errors.loadFailed");
      setErr(msg);
      setRows([]);
      setTotal(0);
      setAllRowsForKpi([]);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qsKey]);

  const kpi = useMemo(() => receiptsService.buildKpi(allRowsForKpi), [allRowsForKpi]);

  async function postReceipt(receiptId: string) {
    if (!canPost) return;

    openConfirm({
      title: t("financePurchases.confirm.postTitle"),
      description: t("financePurchases.confirm.postDesc"),
      action: async () => {
        setConfirmBusy(true);
        setBusy(true);
        try {
          await receiptsService.post(receiptId);
          showToast("success", t("financePurchases.toast.postedOk"));
          await load();
        } catch (e: any) {
          showToast(
            "error",
            e?.response?.data?.message || e?.message || t("financePurchases.errors.postFailed")
          );
        } finally {
          setBusy(false);
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  const columns: DataTableColumn<InventoryReceipt>[] = [
    {
      key: "id",
      label: t("financePurchases.table.id"),
      render: (row) => <span className="font-mono text-xs">{shortId(row.id)}</span>,
    },
    {
      key: "warehouse",
      label: t("financePurchases.table.warehouse"),
      render: (row) => row.warehouses?.name || "—",
    },
    {
      key: "supplier",
      label: t("financePurchases.table.supplier"),
      render: (row) => row.supplier_name || "—",
    },
    {
      key: "invoice",
      label: t("financePurchases.table.invoice"),
      render: (row) => (
        <div className="space-y-0.5">
          <div className="text-sm">{row.invoice_no || "—"}</div>
          <div className="text-xs text-gray-500">{fmtDate(row.invoice_date)}</div>
        </div>
      ),
    },
    {
      key: "items",
      label: t("financePurchases.table.items"),
      render: (row) => <span className="text-sm">{Array.isArray(row.items) ? row.items.length : 0}</span>,
    },
    {
      key: "total",
      label: t("financePurchases.table.total"),
      render: (row) => <span className="font-semibold">{fmtMoney(row.total_amount)}</span>,
    },
    {
      key: "status",
      label: t("financePurchases.table.status"),
      render: (row) => <StatusBadge status={receiptStatus(row)} />,
    },
    {
      key: "created",
      label: t("financePurchases.table.createdAt"),
      render: (row) => <span className="text-gray-600">{fmtDate(row.created_at)}</span>,
    },
    {
      key: "actions",
      label: t("common.actions"),
      headerClassName: "text-left",
      className: "text-left",
      render: (row) => {
        const st = receiptStatus(row);

        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={`/finance/purchases/${row.id}`}>
              <Button variant="secondary">{t("common.view")}</Button>
            </Link>

            {canPost && st === "SUBMITTED" ? (
              <Button variant="primary" onClick={() => postReceipt(row.id)} disabled={busy}>
                {t("financePurchases.actions.post")}
              </Button>
            ) : null}

            {st === "POSTED" ? (
              <span className="text-xs text-gray-500">
                {t("financePurchases.meta.postedAt")}: {fmtDate(row.posted_at)}
              </span>
            ) : null}
          </div>
        );
      },
    },
  ];

  const tabs = [
    { key: "ALL", label: t("financePurchases.tabs.all") },
    { key: "DRAFT", label: t("financePurchases.tabs.draft") },
    { key: "POSTED", label: t("financePurchases.tabs.posted") },
    { key: "SUBMITTED", label: t("financePurchases.tabs.submitted") },
  ] as Array<{ key: ReceiptStatus; label: string }>;

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <PageHeader
        title={t("financePurchases.title")}
        subtitle={
          <span className="text-sm text-gray-600">
            {t("common.role")}: <span className="font-semibold text-gray-900">{role || "—"}</span>{" "}
            {!canPost ? <span className="text-gray-500">({t("financePurchases.viewOnly")})</span> : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/finance">
              <Button variant="secondary">{t("sidebar.finance")}</Button>
            </Link>
            <Button variant="secondary" onClick={load} disabled={loading || busy} isLoading={loading || busy}>
              {t("common.refresh")}
            </Button>
          </div>
        }
      />

      <Card>
        <TabsBar
          value={status}
          onChange={(value) => setParam("status", String(value))}
          tabs={tabs.map((tab) => ({ key: tab.key, label: tab.label }))}
        />
      </Card>

      <Card>
        <FiltersBar
          left={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              <div>
                <div className="text-xs text-gray-600 mb-1">{t("common.search")}</div>
                <input
                  value={q}
                  onChange={(e) => setParam("q", e.target.value)}
                  placeholder={t("financePurchases.filters.searchPh")}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none"
                />
              </div>

              <div className="flex items-end">
                <div className="text-xs text-gray-500">
                  {t("common.total")}: <span className="font-semibold text-gray-900">{total}</span> —{" "}
                  {t("common.page")}{" "}
                  <span className="font-semibold text-gray-900">
                    {page}/{totalPages}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-start gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">{t("common.rows")}</span>
                  <select
                    value={String(pageSize)}
                    onChange={(e) => setParam("pageSize", e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-2 py-2 outline-none"
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
                    setParam("status", "ALL");
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
          <KpiCard label={t("financePurchases.kpi.postedSum")} value={fmtMoney(kpi.postedSum)} />
          <KpiCard label={t("financePurchases.kpi.postedCount")} value={String(kpi.postedCount)} />
          <KpiCard label={t("financePurchases.kpi.submittedSum")} value={fmtMoney(kpi.submittedSum)} />
          <KpiCard label={t("financePurchases.kpi.submittedCount")} value={String(kpi.submittedCount)} />
        </div>
      ) : null}

      {err ? <div className="text-sm text-red-600">⚠️ {err}</div> : null}

      <DataTable<InventoryReceipt>
        title={t("financePurchases.table.title")}
        columns={columns}
        rows={rows}
        loading={loading}
        total={total}
        page={page}
        pages={totalPages}
        onPrev={page <= 1 ? undefined : () => setParam("page", String(page - 1))}
        onNext={page >= totalPages ? undefined : () => setParam("page", String(page + 1))}
        emptyTitle={t("financePurchases.empty.title")}
        emptyHint={t("financePurchases.empty.hint")}
        onRowClick={(row) => router.push(`/finance/purchases/${row.id}`)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDesc}
        confirmText={t("common.yes")}
        cancelText={t("common.no")}
        tone="warning"
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