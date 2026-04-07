"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";

import { inventoryRequestsService } from "@/src/services/inventory-requests.service";
import { apiGet } from "@/src/lib/api";

type Warehouse = {
  id: string;
  name?: string | null;
};

type Part = {
  id: string;
  name?: string | null;
  part_number?: string | null;
  brand?: string | null;
};

type DraftLine = {
  part_id: string;
  needed_qty: string;
  notes: string;
};

function asArray<T = unknown>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data?.items)) return body.data.items as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  return [];
}

function shortId(v?: string | null) {
  const s = String(v || "");
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export default function NewInventoryRequestClient() {
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const [partQuery, setPartQuery] = useState("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([
    { part_id: "", needed_qty: "", notes: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [partsLoading, setPartsLoading] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  useEffect(() => {
    (async () => {
      try {
        const warehousesRes = await apiGet("/inventory/warehouses");
        const partsRes = await apiGet("/inventory/parts");

        setWarehouses(asArray<Warehouse>(warehousesRes));
        setParts(asArray<Part>(partsRes));
      } catch (e: any) {
        setToast({
          open: true,
          message: e?.response?.data?.message || e?.message || "Failed to load form data",
          type: "error",
        });
      }
    })();
  }, []);

  async function searchParts() {
    setPartsLoading(true);
    try {
      const res = await apiGet("/inventory/parts", {
        q: partQuery || undefined,
      });
      setParts(asArray<Part>(res));
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to search parts",
        type: "error",
      });
    } finally {
      setPartsLoading(false);
    }
  }

  function addRow() {
    setLines((prev) => [...prev, { part_id: "", needed_qty: "", notes: "" }]);
  }

  function removeRow(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const preparedRows = useMemo(
    () => lines.map((row, index) => ({ ...row, __index: index })),
    [lines]
  );

  async function create() {
    if (!warehouseId.trim()) {
      setToast({ open: true, message: "warehouse_id is required", type: "error" });
      return;
    }

    const preparedLines = lines
      .map((line) => ({
        part_id: String(line.part_id || "").trim(),
        needed_qty: Number(line.needed_qty || 0),
        notes: line.notes?.trim() || null,
      }))
      .filter((line) => line.part_id);

    if (!preparedLines.length) {
      setToast({ open: true, message: "At least one line is required", type: "error" });
      return;
    }

    if (preparedLines.some((line) => !line.part_id || !Number.isFinite(line.needed_qty) || line.needed_qty <= 0)) {
      setToast({
        open: true,
        message: "Each line must have a valid part and qty > 0",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await inventoryRequestsService.create({
        warehouse_id: warehouseId.trim(),
        work_order_id: workOrderId.trim() || null,
        notes: notes.trim() || null,
        lines: preparedLines,
      });

      setToast({ open: true, message: "Request created successfully", type: "success" });
      router.push(`/inventory/requests/${res.id}`);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to create request",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: "part_id",
      label: "Part",
      render: (row) => {
        const idx = row.__index as number;
        const current = lines[idx];

        return (
          <select
            value={current.part_id}
            onChange={(e) => updateRow(idx, { part_id: e.target.value })}
            className="w-full rounded-xl border border-black/10 px-3 py-2"
          >
            <option value="">Select part</option>
            {parts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name || "Unnamed"} {part.part_number ? `— ${part.part_number}` : ""}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "qty",
      label: "Qty",
      render: (row) => {
        const idx = row.__index as number;
        const current = lines[idx];

        return (
          <input
            value={current.needed_qty}
            onChange={(e) => updateRow(idx, { needed_qty: e.target.value })}
            className="w-full rounded-xl border border-black/10 px-3 py-2"
            placeholder="1"
          />
        );
      },
    },
    {
      key: "notes",
      label: "Notes",
      render: (row) => {
        const idx = row.__index as number;
        const current = lines[idx];

        return (
          <input
            value={current.notes}
            onChange={(e) => updateRow(idx, { notes: e.target.value })}
            className="w-full rounded-xl border border-black/10 px-3 py-2"
            placeholder="optional"
          />
        );
      },
    },
    {
      key: "remove",
      label: "",
      render: (row) => (
        <Button
          variant="danger"
          disabled={lines.length <= 1}
          onClick={() => removeRow(row.__index)}
        >
          Remove
        </Button>
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
        title="New Request"
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={create} isLoading={loading}>
              Create
            </Button>
          </>
        }
      />

      <Card title="Header">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="mb-1 text-xs text-slate-500">Warehouse</div>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full rounded-xl border border-black/10 px-3 py-2"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || shortId(w.id)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-500">Work Order</div>
            <input
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              placeholder="optional work_order_id"
              className="w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-xs text-slate-500">Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-black/10 px-3 py-2"
            placeholder="optional notes"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-slate-500">Search parts</div>
            <input
              value={partQuery}
              onChange={(e) => setPartQuery(e.target.value)}
              className="w-full rounded-xl border border-black/10 px-3 py-2"
              placeholder="Search by part number / name / brand"
            />
          </div>

          <div>
            <Button onClick={searchParts} isLoading={partsLoading}>
              Search Parts
            </Button>
          </div>
        </div>
      </Card>

      <DataTable
        title="Lines"
        subtitle={`Rows: ${lines.length}`}
        columns={columns}
        rows={preparedRows}
        loading={false}
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={addRow}>
              Add Row
            </Button>
            <Button onClick={create} isLoading={loading}>
              Create
            </Button>
          </div>
        }
      />
    </div>
  );
}