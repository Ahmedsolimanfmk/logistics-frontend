"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PartSelect } from "@/src/components/selectors/PartSelect";
import { WarehouseSelect } from "@/src/components/selectors/WarehouseSelect";
import stockService from "@/src/services/stock.service";

type Line = {
  part_id: string;
  needed_qty: number;
  notes: string;
  available_qty: number | null;
  stock_loading?: boolean;
};

export function InventoryRequestForm({
  workOrderId,
  onCreateRequest,
  onAddLines,
}: {
  workOrderId: string;
  onCreateRequest: (workOrderId: string, payload: any) => Promise<any>;
  onAddLines: (requestId: string, lines: any[]) => Promise<any>;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        part_id: "",
        needed_qty: 1,
        notes: "",
        available_qty: null,
      },
    ]);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function loadStock(index: number, partId: string) {
    if (!warehouseId || !partId) {
      updateLine(index, { available_qty: null });
      return;
    }

    updateLine(index, { stock_loading: true });

    try {
      const res = await stockService.list({
        warehouse_id: warehouseId,
        part_id: partId,
      });

      const stock = res.items[0];

      updateLine(index, {
        available_qty: Number(stock?.qty_on_hand || 0),
        stock_loading: false,
      });
    } catch {
      updateLine(index, {
        available_qty: 0,
        stock_loading: false,
      });
    }
  }

  function handleWarehouseChange(value: string) {
    setWarehouseId(value);

    // reset stock values
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        available_qty: null,
      }))
    );
  }

  async function handleSubmit() {
    if (!warehouseId || lines.length === 0) return;

    const payloadLines = lines.map((line) => ({
      part_id: line.part_id,
      needed_qty: Number(line.needed_qty),
      notes: line.notes ? String(line.notes).trim() : null,
    }));

    setLoading(true);

    try {
      const created = await onCreateRequest(workOrderId, {
        warehouse_id: warehouseId,
        notes: "طلب قطع من أمر شغل",
      });

      const requestId = created?.request?.id || created?.id;

      if (!requestId) {
        throw new Error("لم يتم إنشاء الطلب");
      }

      await onAddLines(requestId, payloadLines);

      setWarehouseId("");
      setLines([]);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    Boolean(warehouseId) &&
    lines.length > 0 &&
    lines.every((line) => {
      if (!line.part_id) return false;
      if (line.available_qty === null) return false;
      if (line.needed_qty <= 0) return false;
      if (line.needed_qty > line.available_qty) return false;
      return true;
    });

  return (
    <Card title="طلب قطع من المخزن">
      <div className="space-y-3">
        {/* Warehouse */}
        <div>
          <div className="mb-1 text-xs text-slate-500">المخزن</div>
          <WarehouseSelect
            value={warehouseId}
            onChange={handleWarehouseChange}
            disabled={loading}
          />
        </div>

        {/* Add line */}
        <Button
          type="button"
          onClick={addLine}
          disabled={loading || !warehouseId}
        >
          إضافة قطعة
        </Button>

        {/* Lines */}
        <div className="space-y-3">
          {lines.map((line, i) => {
            const overStock =
              line.available_qty !== null &&
              line.needed_qty > line.available_qty;

            return (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 p-3 md:grid-cols-12"
              >
                {/* Part */}
                <div className="md:col-span-6">
                  <div className="mb-1 text-xs text-slate-500">
                    قطعة الغيار
                  </div>

                  <PartSelect
                    value={line.part_id}
                    onChange={async (value) => {
                      updateLine(i, {
                        part_id: value,
                        available_qty: null,
                      });
                      await loadStock(i, value);
                    }}
                    disabled={loading || !warehouseId}
                  />

                  <div
                    className={
                      overStock
                        ? "mt-1 text-xs text-red-600"
                        : "mt-1 text-xs text-slate-500"
                    }
                  >
                    {line.stock_loading
                      ? "جاري تحميل الرصيد..."
                      : line.part_id
                      ? `الرصيد: ${line.available_qty ?? "-"}`
                      : "اختر قطعة"}
                  </div>
                </div>

                {/* Qty */}
                <div className="md:col-span-2">
                  <div className="mb-1 text-xs text-slate-500">
                    الكمية
                  </div>

                  <input
                    type="number"
                    min={1}
                    value={line.needed_qty}
                    onChange={(e) =>
                      updateLine(i, {
                        needed_qty: Number(e.target.value),
                      })
                    }
                    className="trex-input w-full px-3 py-2 text-sm"
                    disabled={loading}
                  />

                  {overStock && (
                    <div className="mt-1 text-xs text-red-600">
                      الكمية أكبر من الرصيد
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="md:col-span-3">
                  <div className="mb-1 text-xs text-slate-500">ملاحظات</div>

                  <input
                    value={line.notes || ""}
                    onChange={(e) =>
                      updateLine(i, { notes: e.target.value })
                    }
                    className="trex-input w-full px-3 py-2 text-sm"
                    disabled={loading}
                  />
                </div>

                {/* Delete */}
                <div className="flex items-end md:col-span-1">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => removeLine(i)}
                    disabled={loading}
                  >
                    حذف
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          isLoading={loading}
          disabled={!canSubmit || loading}
          variant="primary"
        >
          إنشاء الطلب
        </Button>
      </div>
    </Card>
  );
}