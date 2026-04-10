"use client";

import { useEffect, useMemo, useState } from "react";
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
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function shortId(v?: string | null) {
  const s = String(v || "");
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
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

      setRows(Array.isArray(data) ? data : []);
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

  const summary = useMemo(() => {
    const approved = rows.filter(
      (r) => String(r.status || "").toUpperCase() === "APPROVED"
    ).length;
    const pending = rows.filter(
      (r) => String(r.status || "").toUpperCase() === "PENDING"
    ).length;
    const rejected = rows.filter(
      (r) => String(r.status || "").toUpperCase() === "REJECTED"
    ).length;

    return {
      total: rows.length,
      approved,
      pending,
      rejected,
    };
  }, [rows]);

  const columns: DataTableColumn<InventoryRequest>[] = [
    {
      key: "id",
      label: "Request",
      render: (r) => (
        <div className="space-y-1">
          <div className="font-mono text-xs">{shortId(r.id)}</div>
          <div className="text-xs text-slate-500">{r.work_order_id || "—"}</div>
        </div>
      ),
    },
    {
      key: "warehouse",
      label: "Warehouse",
      render: (r) => (
        <div className="space-y-1">
          <div>{r.warehouse?.name || "—"}</div>
          <div className="font-mono text-xs text-slate-500">
            {shortId(r.warehouse_id)}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={String(r.status || "")} />,
    },
    {
      key: "lines",
      label: "Lines",
      render: (r) => String(r.lines?.length ?? 0),
    },
    {
      key: "reservations",
      label: "Reserved",
      render: (r) => String(r.reservations?.length ?? 0),
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
      <Toast
        {...toast}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title="Inventory Requests"
        subtitle={`Total: ${summary.total} • Pending: ${summary.pending} • Approved: ${summary.approved} • Rejected: ${summary.rejected}`}
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
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="status"
              className="rounded-xl border border-black/10 px-3 py-2"
            />
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="warehouse_id"
              className="rounded-xl border border-black/10 px-3 py-2"
            />
            <input
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              placeholder="work_order_id"
              className="rounded-xl border border-black/10 px-3 py-2"
            />
          </>
        }
        right={<Button onClick={load}>Search</Button>}
      />

      <DataTable columns={columns} rows={rows} loading={loading} />
    </div>
  );
}