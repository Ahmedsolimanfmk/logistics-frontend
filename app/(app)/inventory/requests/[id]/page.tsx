"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";

import { inventoryRequestsService } from "@/src/services/inventory-requests.service";
import type {
  InventoryRequest,
  InventoryRequestLine,
  InventoryReservation,
} from "@/src/types/inventory-requests.types";

function shortId(v?: string | null) {
  const s = String(v || "");
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function Info({
  label,
  value,
  hint,
}: {
  label: React.ReactNode;
  value: any;
  hint?: any;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900 break-words">
        {String(value ?? "—")}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-gray-500 font-mono break-words">
          {String(hint ?? "")}
        </div>
      ) : null}
    </div>
  );
}

export default function InventoryRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [row, setRow] = useState<InventoryRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [unreserveLoading, setUnreserveLoading] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  async function load() {
    if (!id) return;

    setLoading(true);
    try {
      const data = await inventoryRequestsService.getById(id);
      setRow(data);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to load request",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function approve() {
    if (!id) return;

    setApproveLoading(true);
    try {
      await inventoryRequestsService.approve(id);
      setToast({
        open: true,
        message: "Request approved successfully",
        type: "success",
      });
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to approve request",
        type: "error",
      });
    } finally {
      setApproveLoading(false);
    }
  }

  async function reject() {
    if (!id) return;

    const reason = window.prompt("Enter rejection reason") || "";
    if (!reason.trim()) return;

    setRejectLoading(true);
    try {
      await inventoryRequestsService.reject(id, reason.trim());
      setToast({
        open: true,
        message: "Request rejected successfully",
        type: "success",
      });
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to reject request",
        type: "error",
      });
    } finally {
      setRejectLoading(false);
    }
  }

  async function unreserve() {
    if (!id) return;

    setUnreserveLoading(true);
    try {
      await inventoryRequestsService.unreserve(id);
      setToast({
        open: true,
        message: "Reservations released successfully",
        type: "success",
      });
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to unreserve request",
        type: "error",
      });
    } finally {
      setUnreserveLoading(false);
    }
  }

  const lineColumns: DataTableColumn<InventoryRequestLine>[] = [
    {
      key: "part",
      label: "Part",
      render: (l) => (
        <div className="space-y-1">
          <div>{l.part?.name || "—"}</div>
          <div className="text-xs font-mono text-slate-500">
            {l.part?.part_number || shortId(l.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "qty",
      label: "Qty",
      render: (l) => String(l.needed_qty ?? 0),
    },
    {
      key: "notes",
      label: "Notes",
      render: (l) => l.notes || "—",
    },
  ];

  const reservationColumns: DataTableColumn<InventoryReservation>[] = [
    {
      key: "part",
      label: "Part",
      render: (r) => (
        <div className="space-y-1">
          <div>{r.part_items?.part?.name || "—"}</div>
          <div className="text-xs font-mono text-slate-500">
            {shortId(r.part_items?.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "internal_serial",
      label: "Internal Serial",
      render: (r) => r.part_items?.internal_serial || "—",
    },
    {
      key: "manufacturer_serial",
      label: "Manufacturer Serial",
      render: (r) => r.part_items?.manufacturer_serial || "—",
    },
    {
      key: "warehouse",
      label: "Warehouse",
      render: (r) => r.part_items?.warehouse?.name || "—",
    },
    {
      key: "status",
      label: "Item Status",
      render: (r) => r.part_items?.status || "—",
    },
  ];

  const status = String(row?.status || "").toUpperCase();
  const canApprove = status === "PENDING";
  const canReject = status === "PENDING" || status === "APPROVED";
  const canUnreserve = status === "APPROVED";

  const counts = useMemo(() => {
    return {
      lines: row?.lines?.length ?? 0,
      reservations: row?.reservations?.length ?? 0,
    };
  }, [row]);

  if (!row && loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!row && !loading) {
    return <div className="p-6">Request not found</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <Toast
        {...toast}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title={`Request ${shortId(row?.id)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              Back
            </Button>

            {canApprove ? (
              <Button onClick={approve} isLoading={approveLoading}>
                Approve
              </Button>
            ) : null}

            {canUnreserve ? (
              <Button
                variant="secondary"
                onClick={unreserve}
                isLoading={unreserveLoading}
              >
                Unreserve
              </Button>
            ) : null}

            {canReject ? (
              <Button variant="danger" onClick={reject} isLoading={rejectLoading}>
                Reject
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={String(row?.status || "")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Info
          label="Warehouse"
          value={row?.warehouse?.name || "—"}
          hint={shortId(row?.warehouse_id)}
        />
        <Info label="Work Order" value={row?.work_order_id || "—"} />
        <Info label="Created At" value={fmtDate(row?.created_at)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Info label="Lines Count" value={counts.lines} />
        <Info label="Reserved Count" value={counts.reservations} />
      </div>

      <DataTable
        title="Lines"
        columns={lineColumns}
        rows={row?.lines || []}
        loading={loading}
      />

      <DataTable
        title="Reservations"
        columns={reservationColumns}
        rows={row?.reservations || []}
        loading={loading}
      />
    </div>
  );
}