"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PartSelect } from "@/src/components/selectors/PartSelect";

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
  const [requestId, setRequestId] = useState<string | null>(null);
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

  async function handleCreateRequest() {
    if (!warehouseId.trim()) return;

    setLoading(true);
    try {
      const res = await onCreateRequest(workOrderId, {
        warehouse_id: warehouseId.trim(),
        notes: "طلب قطع من أمر شغل",
      });

      const nextId = res?.request?.id || res?.id;
      if (nextId) setRequestId(nextId);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLines() {
    if (!requestId || lines.length === 0) return;

    const payload = lines
      .filter((x) => x.part_id && Number(x.needed_qty) > 0)
      .map((x) => ({
        part_id: x.part_id,
        needed_qty: Number(x.needed_qty),
        notes: x.notes ? String(x.notes).trim() : null,
      }));

    if (payload.length === 0) return;

    setLoading(true);
    try {
      await onAddLines(requestId, payload);
      setLines([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="طلب قطع من المخزن">
      <div className="space-y-3">
        {!requestId ? (
          <>
            <div>
              <div className="mb-1 text-xs text-slate-500">
                Warehouse ID مؤقتًا
              </div>
              <input
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="trex-input w-full px-3 py-2 text-sm"
                placeholder="اكتب warehouse_id مؤقتًا"
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleCreateRequest}
              isLoading={loading}
              disabled={loading || !warehouseId.trim()}
              variant="primary"
            >
              إنشاء طلب صرف
            </Button>
          </>
        ) : (
          <>
            <div className="text-xs text-slate-500">
              طلب الصرف: <span className="font-mono">{requestId}</span>
            </div>

            <Button type="button" onClick={addLine}>
              إضافة قطعة
            </Button>

            <div className="space-y-3">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 p-3 md:grid-cols-12"
                >
                  <div className="md:col-span-6">
                    <div className="mb-1 text-xs text-slate-500">
                      قطعة الغيار
                    </div>
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
              onClick={handleSaveLines}
              isLoading={loading}
              disabled={loading || lines.length === 0}
              variant="primary"
            >
              حفظ طلب القطع
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}