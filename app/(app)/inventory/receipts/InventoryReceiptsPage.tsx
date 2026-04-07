"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

import { receiptsService } from "@/src/services/receipts.service";
import type { InventoryReceipt } from "@/src/types/receipts.types";

function shortId(id: string | null | undefined) {
  const s = String(id || "");
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function formatMoney(v: unknown) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InventoryReceiptsPage() {
  const t = useT();

  const [rows, setRows] = useState<InventoryReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  async function load() {
    setLoading(true);
    try {
      const result = await receiptsService.list({
        status: status || undefined,
        warehouse_id: warehouseId || undefined,
      });

      setRows(Array.isArray(result?.items) ? result.items : []);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const posted = rows.filter(
      (r) => String(r.status || "").toUpperCase() === "POSTED"
    );
    const submitted = rows.filter(
      (r) => String(r.status || "").toUpperCase() === "SUBMITTED"
    );

    return {
      total: rows.length,
      postedCount: posted.length,
      submittedCount: submitted.length,
      postedAmount: posted.reduce((sum, r) => sum + Number(r.total_amount || 0), 0),
    };
  }, [rows]);

  const columns: DataTableColumn<InventoryReceipt>[] = [
    {
      key: "id",
      label: "Receipt",
      render: (row) => (
        <div className="space-y-1">
          <div className="font-mono text-xs text-slate-700">{shortId(row.id)}</div>
          <div className="text-xs text-slate-500">{row.invoice_no || "—"}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={String(row.status || "")} />,
    },
    {
      key: "vendor",
      label: "Vendor",
      render: (row) => (
        <div className="space-y-1">
          <div>{row.vendor?.name || "—"}</div>
          <div className="font-mono text-xs text-slate-500">
            {shortId(row.vendor_id)}
          </div>
        </div>
      ),
    },
    {
      key: "warehouse",
      label: "Warehouse",
      render: (row) => (
        <div className="space-y-1">
          <div>{row.warehouse?.name || "—"}</div>
          <div className="font-mono text-xs text-slate-500">
            {shortId(row.warehouse_id)}
          </div>
        </div>
      ),
    },
    {
      key: "items",
      label: "Items",
      render: (row) => String(row.items?.length ?? 0),
    },
    {
      key: "total_amount",
      label: "Total",
      render: (row) => formatMoney(row.total_amount),
    },
    {
      key: "open",
      label: "Open",
      render: (row) => (
        <Link href={`/inventory/receipts/${row.id}`}>
          <Button variant="secondary">Open</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast
        {...toast}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title="Receipts"
        subtitle={`Total: ${stats.total} • Submitted: ${stats.submittedCount} • Posted: ${stats.postedCount}`}
        actions={
          <>
            <Link href="/inventory/receipts/new">
              <Button variant="primary">New</Button>
            </Link>
            <Button onClick={load} isLoading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-slate-500">Total Receipts</div>
          <div className="mt-1 text-xl font-semibold">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-slate-500">Submitted</div>
          <div className="mt-1 text-xl font-semibold">{stats.submittedCount}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-slate-500">Posted Amount</div>
          <div className="mt-1 text-xl font-semibold">
            {formatMoney(stats.postedAmount)}
          </div>
        </div>
      </div>

      <FiltersBar
        left={
          <>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-black/10 px-3 py-2"
              placeholder="Status"
            />
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="rounded-xl border border-black/10 px-3 py-2"
              placeholder="Warehouse ID"
            />
          </>
        }
        right={<Button onClick={load}>Search</Button>}
      />

      <DataTable<InventoryReceipt>
        columns={columns}
        rows={rows}
        loading={loading}
      />
    </div>
  );
}