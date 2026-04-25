"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PartSelect } from "@/src/components/selectors/PartSelect";
import { WarehouseSelect } from "@/src/components/selectors/WarehouseSelect";

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
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        part_id: "",
        needed_qty: 1,
        notes: "",
      },
    ]);
  }

  function updateLine(index: number, field: string, value: any) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!warehouseId || lines.length === 0) return;

    const payloadLines = lines
      .filter((x) => x.part_id && Number(x.needed_qty) > 0)
      .map((x) => ({
        part_id: x.part_id,
        needed_qty: Number(x.needed_qty),
        notes: x.notes ? String(x.notes).trim() : null,
      }));

    if (payloadLines.length === 0) return;

    setLoading(true);

    try {
      const created = await onCreateRequest(workOrderId, {
        warehouse_id: warehouseId,
        notes: "طلب قطع من أمر شغل",
      });

      const requestId = created?.request?.id || created?.id;

      if (!requestId) {
        throw new Error("لم يتم إنشاء طلب الصرف بشكل صحيح");
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
    lines.some((x) => x.part_id && Number(x.needed_qty) > 0);

  return (
    <Card title="طلب قطع من المخزن">
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs text-slate-500">المخزن</div>
          <WarehouseSelect
            value={warehouseId}
            onChange={setWarehouseId}
            disabled={loading}
          />
        </div>

        <Button type="button" onClick={addLine} disabled={loading}>
          إضافة قطعة
        </Button>

        <div className="space-y-3">
          {lines.map((line, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 p-3 md:grid-cols-12"
            >
              <div className="md:col-span-6">
                <div className="mb-1 text-xs text-slate-500">قطعة الغيار</div>
                <PartSelect
                  value={line.part_id}
                  onChange={(value) => updateLine(i, "part_id", value)}
                  disabled={loading}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-slate-500">
                  الكمية المطلوبة
                </div>
                <input
                  type="number"
                  min={1}
                  value={line.needed_qty}
                  onChange={(e) =>
                    updateLine(i, "needed_qty", Number(e.target.value))
                  }
                  className="trex-input w-full px-3 py-2 text-sm"
                  disabled={loading}
                />
              </div>

              <div className="md:col-span-3">
                <div className="mb-1 text-xs text-slate-500">ملاحظات</div>
                <input
                  value={line.notes || ""}
                  onChange={(e) => updateLine(i, "notes", e.target.value)}
                  className="trex-input w-full px-3 py-2 text-sm"
                  placeholder="اختياري"
                  disabled={loading}
                />
              </div>

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
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          isLoading={loading}
          disabled={loading || !canSubmit}
          variant="primary"
        >
          إنشاء طلب الصرف وحفظ القطع
        </Button>
      </div>
    </Card>
  );
}