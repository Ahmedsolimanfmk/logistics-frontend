"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PartSelect } from "@/src/components/selectors/PartSelect";

export function InstallationsForm({
  workOrderId,
  onAddInstallations,
}: {
  workOrderId: string;
  onAddInstallations: (id: string, items: any[]) => Promise<any>;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        part_id: "",
        qty_installed: 1,
        part_item_id: "",
        odometer: "",
        notes: "",
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit() {
    if (items.length === 0) return;

    const payload = items
      .filter((item) => item.part_id)
      .map((item) => ({
        part_id: item.part_id,
        part_item_id:
          item.part_item_id && String(item.part_item_id).trim()
            ? String(item.part_item_id).trim()
            : null,
        qty_installed: item.part_item_id
          ? 1
          : Number(item.qty_installed || 0),
        odometer:
          item.odometer !== "" && item.odometer !== null
            ? Number(item.odometer)
            : null,
        notes: item.notes ? String(item.notes).trim() : null,
      }))
      .filter((item) => Number(item.qty_installed) > 0);

    if (payload.length === 0) return;

    setLoading(true);

    try {
      await onAddInstallations(workOrderId, payload);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="تركيب قطع الغيار">
      <div className="space-y-3">
        <Button onClick={addItem} type="button">
          إضافة سطر
        </Button>

        <div className="space-y-3">
          {items.map((item, i) => {
            const isSerial = Boolean(
              item.part_item_id && String(item.part_item_id).trim()
            );

            return (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 p-3 md:grid-cols-12"
              >
                <div className="md:col-span-4">
                  <div className="mb-1 text-xs text-slate-500">قطعة الغيار</div>
                  <PartSelect
                    value={item.part_id}
                    onChange={(value) => updateItem(i, "part_id", value)}
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-3">
                  <div className="mb-1 text-xs text-slate-500">
                    Serial / Part Item ID
                  </div>
                  <input
                    value={item.part_item_id || ""}
                    onChange={(e) =>
                      updateItem(i, "part_item_id", e.target.value)
                    }
                    className="trex-input w-full px-3 py-2 text-sm"
                    placeholder="اختياري للقطع المسلسلة"
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-1">
                  <div className="mb-1 text-xs text-slate-500">الكمية</div>
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    value={isSerial ? 1 : item.qty_installed}
                    onChange={(e) =>
                      updateItem(i, "qty_installed", Number(e.target.value))
                    }
                    className="trex-input w-full px-3 py-2 text-sm"
                    disabled={loading || isSerial}
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="mb-1 text-xs text-slate-500">العداد</div>
                  <input
                    type="number"
                    min={0}
                    value={item.odometer}
                    onChange={(e) => updateItem(i, "odometer", e.target.value)}
                    className="trex-input w-full px-3 py-2 text-sm"
                    placeholder="اختياري"
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-1">
                  <div className="mb-1 text-xs text-slate-500">ملاحظات</div>
                  <input
                    value={item.notes || ""}
                    onChange={(e) => updateItem(i, "notes", e.target.value)}
                    className="trex-input w-full px-3 py-2 text-sm"
                    placeholder="اختياري"
                    disabled={loading}
                  />
                </div>

                <div className="flex items-end md:col-span-1">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => removeItem(i)}
                    disabled={loading}
                  >
                    حذف
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleSubmit}
          isLoading={loading}
          disabled={loading || items.length === 0}
          variant="primary"
        >
          حفظ التركيبات
        </Button>
      </div>
    </Card>
  );
}