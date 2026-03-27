"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";

import { inventoryRequestsService } from "@/src/services/inventory-requests.service";
import type { InventoryRequest } from "@/src/types/inventory-requests.types";

export default function InventoryRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [row, setRow] = useState<InventoryRequest | null>(null);
  const [loading, setLoading] = useState(false);

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
      setToast({ open: true, message: e?.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function approve() {
    await inventoryRequestsService.approve(id);
    load();
  }

  async function reject() {
    await inventoryRequestsService.reject(id, "Rejected");
    load();
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: "Part",
      render: (l) => l.parts?.name || "—",
    },
    {
      key: "qty",
      label: "Qty",
      render: (l) => String(l.needed_qty),
    },
  ];

  if (!row) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <Toast {...toast} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <PageHeader
        title={`Request ${row.id}`}
        actions={
          <>
            <Button onClick={() => router.back()}>Back</Button>
            <Button onClick={approve}>Approve</Button>
            <Button variant="danger" onClick={reject}>
              Reject
            </Button>
          </>
        }
      />

      <StatusBadge status={row.status} />

      <DataTable columns={columns} rows={row.lines || []} loading={loading} />
    </div>
  );
}