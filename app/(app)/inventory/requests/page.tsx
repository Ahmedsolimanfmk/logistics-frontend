"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

import { inventoryRequestsService } from "@/src/services/inventory-requests.service";
import type { InventoryRequest } from "@/src/types/inventory-requests.types";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ar-EG");
}

export default function InventoryRequestsPage() {
  const t = useT();

  const [rows, setRows] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  async function load() {
    setLoading(true);
    try {
      const data = await inventoryRequestsService.list({
        status: status || undefined,
        warehouse_id: warehouseId || undefined,
        work_order_id: workOrderId || undefined,
      });

      setRows(data);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const columns: DataTableColumn<InventoryRequest>[] = [
    {
      key: "id",
      label: "ID",
      render: (r) => r.id,
    },
    {
      key: "warehouse",
      label: "Warehouse",
      render: (r) => r.warehouses?.name || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "lines",
      label: "Lines",
      render: (r) => String(r.lines?.length ?? 0),
    },
    {
      key: "created_at",
      label: "Created",
      render: (r) => fmtDate(r.created_at),
    },
    {
      key: "open",
      label: "",
      render: (r) => (
        <Link href={`/inventory/requests/${r.id}`}>
          <Button variant="secondary">Open</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast {...toast} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <PageHeader
        title="Inventory Requests"
        actions={
          <>
            <Link href="/inventory/requests/new">
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
            <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="status" />
            <input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="warehouse_id" />
            <input value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} placeholder="work_order_id" />
          </>
        }
        right={<Button onClick={load}>Search</Button>}
      />

      <DataTable columns={columns} rows={rows} loading={loading} />
    </div>
  );
}