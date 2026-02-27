"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { unwrapItems } from "@/src/lib/api";
import { listReceipts, type InventoryReceipt } from "@/src/lib/receipts.api";

// ✅ Design System (الموحد)
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

const fmtMoney = (n: any) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n ?? 0));

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export default function InventoryReceiptsPage() {
  const t = useT();

  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InventoryReceipt[]>([]);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listReceipts({
        status: status || undefined,
        warehouse_id: warehouseId || undefined,
      });
      setRows(unwrapItems<InventoryReceipt>(res));
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => rows || [], [rows]);

  const columns: DataTableColumn<InventoryReceipt>[] = [
    {
      key: "id",
      label: t("receipts.colId"),
      className: "font-mono text-xs text-gray-700",
      render: (r) => r.id,
    },
    {
      key: "status",
      label: t("receipts.colStatus"),
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "warehouse",
      label: t("receipts.colWarehouse"),
      render: (r) => (
        <div>
          <div className="text-gray-900">{r.warehouses?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">{shortId(r.warehouse_id)}</div>
        </div>
      ),
    },
    {
      key: "supplier_name",
      label: t("receipts.colSupplier"),
      render: (r) => <span className="text-gray-900">{r.supplier_name || "—"}</span>,
    },
    {
      key: "invoice",
      label: t("receipts.colInvoice"),
      render: (r) => (
        <div>
          <div className="text-gray-900">{r.invoice_no || "—"}</div>
          <div className="text-xs text-gray-500">
            {r.invoice_date ? String(r.invoice_date).slice(0, 10) : "—"}
          </div>
        </div>
      ),
    },
    {
      key: "items",
      label: t("receipts.colItems"),
      render: (r) => String(r.items?.length ?? 0),
    },
    {
      key: "total_amount",
      label: t("receipts.colTotal"),
      render: (r) =>
        r.total_amount == null ? "—" : <span className="text-gray-900">{fmtMoney(r.total_amount)}</span>,
    },
    {
      key: "created_at",
      label: t("receipts.colCreatedAt"),
      render: (r) => <span className="text-gray-700">{fmtDate(r.created_at)}</span>,
    },
    {
      key: "open",
      label: t("receipts.colOpen"),
      render: (r) => (
        <Link href={`/inventory/receipts/${r.id}`}>
          <Button variant="secondary" className="rounded-xl">
            {t("common.open")}
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title={t("receipts.title")}
        subtitle={t("receipts.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/inventory/receipts/new">
              <Button variant="primary">{t("receipts.new")}</Button>
            </Link>
            <Button variant="secondary" onClick={load} isLoading={loading}>
              {t("common.refresh")}
            </Button>
          </div>
        }
      />

      <FiltersBar
        left={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder={t("receipts.filterStatus")}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder={t("receipts.filterWarehouseId")}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={load} isLoading={loading}>
              {t("common.search")}
            </Button>
            <Button
              variant="ghost"
              disabled={loading}
              onClick={() => {
                setStatus("");
                setWarehouseId("");
                setTimeout(load, 0);
              }}
            >
              {t("common.reset")}
            </Button>
          </div>
        }
      />

      <DataTable
        title={t("receipts.title")}
        subtitle={t("receipts.subtitle")}
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle={t("common.noData")}
        emptyHint={t("common.tryFilters") ?? "جرّب تغيير الفلاتر أو البحث."}
        minWidthClassName="min-w-[1100px]"
      />
    </div>
  );
}