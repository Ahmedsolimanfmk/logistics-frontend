"use client";

import { useEffect, useState } from "react";
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

      setRows(result.items);
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

  const columns: DataTableColumn<InventoryReceipt>[] = [
    {
      key: "id",
      label: "ID",
      render: (row) => row.id,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={String(row.status || "")} />,
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (row) => row.supplier_name || "—",
    },
    {
      key: "items",
      label: "Items",
      render: (row) => String(row.items?.length ?? 0),
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

      <DataTable<InventoryReceipt> columns={columns} rows={rows} loading={loading} />
    </div>
  );
}