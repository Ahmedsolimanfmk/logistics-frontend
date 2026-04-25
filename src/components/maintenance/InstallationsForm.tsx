"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";

type IssuedLine = {
  part_id: string;
  part?: {
    id?: string;
    name?: string | null;
    part_number?: string | null;
    brand?: string | null;
    unit?: string | null;
  } | null;
  qty?: number;
  issued_qty?: number;
  installed_qty?: number;
  qty_installed?: number;
  part_item_id?: string | null;
  part_item?: any;
};

function toNum(v: any) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function getPartName(line: IssuedLine) {
  return line.part?.name || "قطعة غير معروفة";
}

function getPartNumber(line: IssuedLine) {
  return line.part?.part_number || "—";
}

export function InstallationsForm({
  workOrderId,
  issuedLines,
  installedLines,
  onAddInstallations,
}: {
  workOrderId: string;
  issuedLines: IssuedLine[];
  installedLines?: any[];
  onAddInstallations: (id: string, items: any[]) => Promise<any>;
}) {
  const [qtyByPart, setQtyByPart] = useState<Record<string, number>>({});
  const [notesByPart, setNotesByPart] = useState<Record<string, string>>({});
  const [loadingPartId, setLoadingPartId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const issuedMap = new Map<string, any>();

    for (const line of issuedLines || []) {
      const partId = line.part_id;
      if (!partId) continue;

      const prev = issuedMap.get(partId) || {
        part_id: partId,
        part: line.part || null,
        issued_qty: 0,
        installed_qty: 0,
        part_item_id: line.part_item_id || null,
        part_item: line.part_item || null,
      };

      prev.issued_qty += toNum(line.qty ?? line.issued_qty);
      issuedMap.set(partId, prev);
    }

    for (const ins of installedLines || []) {
      const partId = ins.part_id;
      if (!partId) continue;

      const prev = issuedMap.get(partId) || {
        part_id: partId,
        part: ins.part || ins.parts || null,
        issued_qty: 0,
        installed_qty: 0,
        part_item_id: ins.part_item_id || null,
        part_item: ins.part_item || ins.part_items || null,
      };

      prev.installed_qty += toNum(ins.qty_installed);
      issuedMap.set(partId, prev);
    }

    return Array.from(issuedMap.values()).map((x) => ({
      ...x,
      remaining_qty: Math.max(0, toNum(x.issued_qty) - toNum(x.installed_qty)),
    }));
  }, [issuedLines, installedLines]);

  async function handleInstall(row: any) {
    const partId = row.part_id;
    const qty = toNum(qtyByPart[partId] || row.remaining_qty || 0);

    if (!partId || qty <= 0) return;
    if (qty > row.remaining_qty) return;

    setLoadingPartId(partId);

    try {
      await onAddInstallations(workOrderId, [
        {
          part_id: partId,
          qty_installed: qty,
          notes: notesByPart[partId] || null,
        },
      ]);

      setQtyByPart((prev) => ({
        ...prev,
        [partId]: 0,
      }));

      setNotesByPart((prev) => ({
        ...prev,
        [partId]: "",
      }));
    } finally {
      setLoadingPartId(null);
    }
  }

  return (
    <Card title="القطع المصروفة الجاهزة للتركيب">
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-black/10 p-4 text-sm text-slate-500">
            لا توجد قطع مصروفة لهذا أمر الشغل بعد.
          </div>
        ) : (
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-black/[0.03] text-slate-600">
                <tr>
                  <th className="p-3 text-right">القطعة</th>
                  <th className="p-3 text-right">رقم القطعة</th>
                  <th className="p-3 text-right">مصروف</th>
                  <th className="p-3 text-right">مركب</th>
                  <th className="p-3 text-right">المتبقي</th>
                  <th className="p-3 text-right">كمية التركيب</th>
                  <th className="p-3 text-right">ملاحظات</th>
                  <th className="p-3 text-right">إجراء</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const partId = row.part_id;
                  const remaining = toNum(row.remaining_qty);
                  const requestedQty = toNum(qtyByPart[partId] || remaining);
                  const overQty = requestedQty > remaining;
                  const isLoading = loadingPartId === partId;

                  return (
                    <tr key={partId} className="border-t border-black/10">
                      <td className="p-3">
                        <div className="font-semibold">{getPartName(row)}</div>
                        {row.part?.brand ? (
                          <div className="text-xs text-slate-500">
                            {row.part.brand}
                          </div>
                        ) : null}
                      </td>

                      <td className="p-3 font-mono text-xs">
                        {getPartNumber(row)}
                      </td>

                      <td className="p-3">{toNum(row.issued_qty)}</td>

                      <td className="p-3">{toNum(row.installed_qty)}</td>

                      <td className="p-3">
                        <span
                          className={
                            remaining > 0
                              ? "font-semibold text-amber-700"
                              : "font-semibold text-green-700"
                          }
                        >
                          {remaining}
                        </span>
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          min={1}
                          max={remaining}
                          value={qtyByPart[partId] ?? remaining}
                          onChange={(e) =>
                            setQtyByPart((prev) => ({
                              ...prev,
                              [partId]: Number(e.target.value),
                            }))
                          }
                          disabled={remaining <= 0 || isLoading}
                          className="trex-input w-28 px-3 py-2 text-sm"
                        />

                        {overQty ? (
                          <div className="mt-1 text-xs text-red-600">
                            الكمية أكبر من المتبقي
                          </div>
                        ) : null}
                      </td>

                      <td className="p-3">
                        <input
                          value={notesByPart[partId] || ""}
                          onChange={(e) =>
                            setNotesByPart((prev) => ({
                              ...prev,
                              [partId]: e.target.value,
                            }))
                          }
                          disabled={remaining <= 0 || isLoading}
                          placeholder="اختياري"
                          className="trex-input w-full px-3 py-2 text-sm"
                        />
                      </td>

                      <td className="p-3">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => handleInstall(row)}
                          isLoading={isLoading}
                          disabled={
                            isLoading ||
                            remaining <= 0 ||
                            requestedQty <= 0 ||
                            overQty
                          }
                        >
                          تركيب
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

export default InstallationsForm;