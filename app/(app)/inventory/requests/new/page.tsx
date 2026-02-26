"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/src/lib/api";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function isUuid(v: any) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-base font-semibold">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "secondary",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition border";
  const styles: Record<string, string> = {
    primary: "bg-white text-black border-white hover:bg-neutral-200",
    secondary: "bg-white/5 text-white border-white/10 hover:bg-white/10",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, styles[variant], disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}

type Warehouse = { id: string; name?: string | null };

type DraftLine = {
  part_id: string;
  needed_qty: number;
  notes?: string;
};

export default function InventoryRequestNewPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const qWarehouseId = sp.get("warehouse_id") || "";
  const qWorkOrderId = sp.get("work_order_id") || "";

  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" });

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [whLoading, setWhLoading] = useState(false);

  const [warehouseId, setWarehouseId] = useState(qWarehouseId);
  const [workOrderId, setWorkOrderId] = useState(qWorkOrderId);

  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState<DraftLine[]>([]);
  const [linePartId, setLinePartId] = useState("");
  const [lineQty, setLineQty] = useState<number>(1);
  const [lineNotes, setLineNotes] = useState("");

  const [saving, setSaving] = useState(false);

  async function loadWarehouses() {
    setWhLoading(true);
    try {
      const res = await api.get("/inventory/warehouses");
      const arr = Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
      setWarehouses(arr);
    } catch (e: any) {
      setWarehouses([]);
      setToast({ open: true, message: e?.response?.data?.message || e?.message || "Failed to load warehouses", type: "error" });
    } finally {
      setWhLoading(false);
    }
  }

  useEffect(() => {
    loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // لو query فيها warehouse_id صح، ثبتها
    if (qWarehouseId && !warehouseId) setWarehouseId(qWarehouseId);
    if (qWorkOrderId && !workOrderId) setWorkOrderId(qWorkOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qWarehouseId, qWorkOrderId]);

  const canSubmit = useMemo(() => {
    if (!isUuid(warehouseId)) return false;
    if (workOrderId && !isUuid(workOrderId)) return false;
    if (!lines.length) return false;
    return true;
  }, [warehouseId, workOrderId, lines]);

  function addLine() {
    const pid = linePartId.trim();
    const qty = Number(lineQty);

    if (!isUuid(pid)) {
      setToast({ open: true, message: "part_id لازم يكون UUID صحيح", type: "error" });
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setToast({ open: true, message: "needed_qty لازم يكون > 0", type: "error" });
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        part_id: pid,
        needed_qty: Math.floor(qty),
        notes: lineNotes.trim() ? lineNotes.trim() : undefined,
      },
    ]);

    setLinePartId("");
    setLineQty(1);
    setLineNotes("");
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function createRequest() {
    if (!canSubmit) {
      setToast({ open: true, message: "تأكد من warehouse_id + lines", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        warehouse_id: warehouseId.trim(),
        work_order_id: workOrderId.trim() ? workOrderId.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
        lines: lines.map((l) => ({
          part_id: l.part_id,
          needed_qty: l.needed_qty,
          notes: l.notes ?? null,
        })),
      };

      const res = await api.post("/inventory/requests", payload);

      const createdId = res.data?.id || res.data?.request?.id;
      setToast({ open: true, message: "✅ تم إنشاء الطلب", type: "success" });

      if (createdId) {
        router.replace(`/inventory/requests/${createdId}`);
      } else {
        router.replace("/inventory/requests");
      }
    } catch (e: any) {
      setToast({ open: true, message: e?.response?.data?.message || e?.message || "Failed to create request", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4 text-white">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">Inventory Requests</div>
          <div className="text-xl font-bold">Create New Request</div>
          <div className="mt-1 text-xs text-slate-400 font-mono">
            warehouse_id: {warehouseId ? shortId(warehouseId) : "—"}{" "}
            {workOrderId ? `• work_order_id: ${shortId(workOrderId)}` : ""}
          </div>
        </div>

        <Link
          href="/inventory/requests"
          className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          ← Back
        </Link>
      </div>

      <Card title="Header">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">warehouse_id</div>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            >
              <option value="">{whLoading ? "Loading…" : "Select warehouse"}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.id}
                </option>
              ))}
            </select>
            {warehouseId && !isUuid(warehouseId) ? (
              <div className="mt-1 text-xs text-red-200">⚠ warehouse_id غير صحيح</div>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">work_order_id (optional)</div>
            <input
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
              placeholder="uuid"
            />
            {workOrderId && !isUuid(workOrderId) ? (
              <div className="mt-1 text-xs text-red-200">⚠ work_order_id غير صحيح</div>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">notes (optional)</div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
              placeholder="Optional"
            />
          </div>
        </div>
      </Card>

      <Card
        title="Lines"
        right={
          <span className="text-xs text-slate-300">
            Count: <span className="font-semibold">{lines.length}</span>
          </span>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">part_id (UUID)</div>
            <input
              value={linePartId}
              onChange={(e) => setLinePartId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
              placeholder="uuid"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">needed_qty</div>
            <input
              type="number"
              value={lineQty}
              onChange={(e) => setLineQty(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">line notes (optional)</div>
            <input
              value={lineNotes}
              onChange={(e) => setLineNotes(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
              placeholder="Optional"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <Button variant="secondary" onClick={addLine}>
              + Add line
            </Button>

            <Button variant="primary" onClick={createRequest} disabled={!canSubmit || saving}>
              {saving ? "Saving…" : "Create Request"}
            </Button>

            {!canSubmit ? (
              <div className="text-xs text-slate-300">
                ℹ️ لازم تختار warehouse + تضيف lines
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-2xl border border-white/10">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Part</th>
                <th className="text-left px-4 py-3">Needed</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.length ? (
                lines.map((l, idx) => (
                  <tr key={`${l.part_id}_${idx}`} className="border-t border-white/10">
                    <td className="px-4 py-3 font-mono text-xs">{shortId(l.part_id)}</td>
                    <td className="px-4 py-3">{l.needed_qty}</td>
                    <td className="px-4 py-3 text-slate-300">{l.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <Button variant="danger" onClick={() => removeLine(idx)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-white/10">
                  <td colSpan={4} className="px-4 py-6 text-slate-400">
                    No lines yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}