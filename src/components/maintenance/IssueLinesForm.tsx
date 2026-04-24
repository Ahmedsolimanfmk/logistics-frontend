"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PartSelect } from "@/src/components/selectors/PartSelect";

export function IssueLinesForm({
  workOrderId,
  onCreateIssue,
  onAddLines,
}: {
  workOrderId: string;
  onCreateIssue: (workOrderId: string) => Promise<any>;
  onAddLines: (issueId: string, lines: any[]) => Promise<any>;
}) {
  const [issueId, setIssueId] = useState<string | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        part_id: "",
        qty: 1,
        unit_cost: 0,
        notes: "",
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: string, value: any) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  async function handleCreateIssue() {
    setLoading(true);

    try {
      const res = await onCreateIssue(workOrderId);
      const nextIssueId = res?.issue?.id || res?.issue_id || res?.id;

      if (nextIssueId) {
        setIssueId(nextIssueId);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitLines() {
    if (!issueId || lines.length === 0) return;

    const payload = lines
      .filter((line) => line.part_id && Number(line.qty) > 0)
      .map((line) => ({
        part_id: line.part_id,
        qty: Number(line.qty),
        unit_cost: Number(line.unit_cost || 0),
        notes: line.notes ? String(line.notes).trim() : null,
      }));

    if (payload.length === 0) return;

    setLoading(true);

    try {
      await onAddLines(issueId, payload);
      setLines([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="صرف قطع الغيار">
      <div className="space-y-3">
        {!issueId ? (
          <Button onClick={handleCreateIssue} isLoading={loading}>
            إنشاء إذن صرف
          </Button>
        ) : (
          <>
            <div className="text-xs text-slate-500">
              إذن الصرف: <span className="font-mono">{issueId}</span>
            </div>

            <Button onClick={addLine} type="button">
              إضافة سطر
            </Button>

            <div className="space-y-3">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 p-3 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
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
                    <div className="mb-1 text-xs text-slate-500">الكمية</div>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(i, "qty", Number(e.target.value))
                      }
                      className="trex-input w-full px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="mb-1 text-xs text-slate-500">
                      تكلفة الوحدة
                    </div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_cost}
                      onChange={(e) =>
                        updateLine(i, "unit_cost", Number(e.target.value))
                      }
                      className="trex-input w-full px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="mb-1 text-xs text-slate-500">ملاحظات</div>
                    <input
                      value={line.notes || ""}
                      onChange={(e) =>
                        updateLine(i, "notes", e.target.value)
                      }
                      className="trex-input w-full px-3 py-2 text-sm"
                      placeholder="اختياري"
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
              onClick={handleSubmitLines}
              isLoading={loading}
              disabled={loading || lines.length === 0}
              variant="primary"
            >
              حفظ الصرف
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}