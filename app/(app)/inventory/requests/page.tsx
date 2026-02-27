"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";
import { unwrapItems } from "@/src/lib/api";
import { listInventoryRequests, type InventoryRequest } from "@/src/lib/inventory.api";

// ✅ Design System (الموحد)
import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

// ✅ Toast (حسب مسارك الحالي)
import { Toast } from "@/src/components/Toast";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

export default function InventoryRequestsPage() {
  const t = useT();

  const [status, setStatus] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [workOrderId, setWorkOrderId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InventoryRequest[]>([]);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listInventoryRequests({
        status: status || undefined,
        warehouse_id: warehouseId || undefined,
        work_order_id: workOrderId || undefined,
      });
      setRows(unwrapItems<InventoryRequest>(res));
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => rows || [], [rows]);

  const columns: DataTableColumn<InventoryRequest>[] = [
    {
      key: "id",
      label: t("inventory.colId"),
      className: "font-mono text-xs text-gray-700",
      render: (r) => r.id,
    },
    {
      key: "warehouse",
      label: t("inventory.colWarehouse"),
      render: (r) => (
        <div>
          <div className="text-gray-900">{r.warehouses?.name || "—"}</div>
          <div className="text-xs text-gray-500">{r.warehouse_id || "—"}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: t("inventory.colStatus"),
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "lines",
      label: t("inventory.colLines"),
      render: (r) => String(r.lines?.length ?? 0),
    },
    {
      key: "created_at",
      label: t("inventory.colCreatedAt"),
      render: (r) => <span className="text-gray-700">{fmtDate(r.created_at)}</span>,
    },
    {
      key: "open",
      label: t("inventory.colOpen"),
      render: (r) => (
        <Link href={`/inventory/requests/${r.id}`}>
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
        title={t("inventory.requestsTitle")}
        subtitle={t("inventory.requestsSubtitle")}
        actions={
          <Button variant="secondary" onClick={load} isLoading={loading}>
            {t("common.refresh")}
          </Button>
        }
      />

      {/* Filters */}
      <FiltersBar
        left={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder={t("inventory.filterStatus")}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder={t("inventory.filterWarehouseId")}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              placeholder={t("inventory.filterWorkOrderId")}
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
              onClick={() => {
                setStatus("");
                setWarehouseId("");
                setWorkOrderId("");
                // تحميل بعد تصفير الstate مباشرة
                setTimeout(load, 0);
              }}
              disabled={loading}
            >
              {t("common.reset")}
            </Button>
          </div>
        }
      />

      <DataTable
        title={t("inventory.requestsTitle")}
        subtitle={t("inventory.requestsSubtitle")}
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle={t("common.noData")}
        emptyHint={t("inventory.tryFilters") ?? t("common.tryFilters") ?? "جرّب تغيير الفلاتر أو البحث."}
        minWidthClassName="min-w-[900px]"
      />
    </div>
  );
}