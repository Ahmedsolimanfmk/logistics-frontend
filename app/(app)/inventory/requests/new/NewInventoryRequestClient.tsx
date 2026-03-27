"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Toast } from "@/src/components/Toast";

import { inventoryRequestsService } from "@/src/services/inventory-requests.service";

export default function NewInventoryRequestPage() {
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  async function create() {
    if (!warehouseId || !lines.length) {
      setToast({ open: true, message: "Missing data", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await inventoryRequestsService.create({
        warehouse_id: warehouseId,
        lines,
      });

      router.push(`/inventory/requests/${res.id}`);
    } catch (e: any) {
      setToast({ open: true, message: e?.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Toast {...toast} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <PageHeader title="New Request" />

      <input
        value={warehouseId}
        onChange={(e) => setWarehouseId(e.target.value)}
        placeholder="warehouse_id"
        className="border p-2"
      />

      <Button onClick={create} isLoading={loading}>
        Create
      </Button>
    </div>
  );
}