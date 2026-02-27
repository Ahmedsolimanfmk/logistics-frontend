"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/src/lib/api";
import { useT } from "@/src/i18n/useT";

// ✅ Design System (الموحد)
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
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

type Warehouse = { id: string; name?: string | null };

type Part = {
  id: string;
  name?: string | null;
  part_number?: string | null;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
};

type DraftLine = {
  part_id: string;
  needed_qty: number;
  notes?: string | null;

  // UI-only
  part_name?: string | null;
  part_number?: string | null;
};

// ======================
// Small DS Input helper (local)
// ======================
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-500 mb-1">{children}</div>;
}
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-gray-300",
        props.className
      )}
    />
  );
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-gray-300",
        props.className
      )}
    />
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-gray-300",
        props.className
      )}
    />
  );
}

// ======================
// Part Search Select (Design-System friendly)
// ======================
function PartSearchSelect({
  value,
  onChange,
  onError,
  placeholder,
}: {
  value: string;
  onChange: (partId: string, part?: Part | null) => void;
  onError: (msg: string) => void;
  placeholder?: string;
}) {
  const t = useT();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Part[]>([]);
  const [selected, setSelected] = useState<Part | null>(null);

  function extractArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.parts)) return data.parts;
    return [];
  }

  async function fetchParts(term: string) {
    const termTrim = String(term || "").trim();
    if (!termTrim) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const r1 = await api
        .get("/inventory/parts", { params: { q: termTrim, page: 1, limit: 20 } })
        .then((r) => r.data)
        .catch(() => null);

      const r2 =
        !r1 &&
        (await api
          .get("/inventory/parts", { params: { search: termTrim, page: 1, limit: 20 } })
          .then((r) => r.data)
          .catch(() => null));

      const r3 =
        !r1 &&
        !r2 &&
        (await api
          .get("/inventory/parts", { params: { name: termTrim, page: 1, limit: 20 } })
          .then((r) => r.data)
          .catch(() => null));

      const data = r1 || r2 || r3;
      const arr = extractArray(data);

      const mapped: Part[] = arr
        .map((x: any) => ({
          id: String(x?.id || ""),
          name: x?.name ?? x?.part_name ?? null,
          part_number: x?.part_number ?? x?.partNo ?? null,
          brand: x?.brand ?? null,
          category: x?.category ?? null,
          unit: x?.unit ?? null,
        }))
        .filter((p: Part) => isUuid(p.id));

      setItems(mapped);
    } catch (e: any) {
      setItems([]);
      onError(e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const h = setTimeout(() => fetchParts(q), 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!value) setSelected(null);
  }, [value]);

  return (
    <div className="relative">
      {selected ? (
        <div className="mb-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <div className="text-sm font-semibold text-gray-900">{selected.name || "—"}</div>
          <div className="mt-1 text-xs text-gray-600">
            {selected.part_number ? `PN: ${selected.part_number} • ` : ""}
            <span className="font-mono">{shortId(selected.id)}</span>
          </div>
        </div>
      ) : null}

      <TextInput
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "ابحث باسم القطعة أو Part Number…"}
      />

      {open ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          <div className="max-h-[280px] overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-gray-500">{t("common.loading")}</div>
            ) : items.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">{t("common.noData")}</div>
            ) : (
              items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={() => {
                    setSelected(p);
                    onChange(p.id, p);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <div className="text-sm font-semibold text-gray-900">{p.name || "—"}</div>
                  <div className="mt-0.5 text-xs text-gray-600">
                    {p.part_number ? `PN: ${p.part_number} • ` : ""}
                    <span className="font-mono">{shortId(p.id)}</span>
                  </div>
                  {(p.brand || p.category) && (
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {p.brand ? `Brand: ${p.brand}` : ""}
                      {p.brand && p.category ? " • " : ""}
                      {p.category ? `Cat: ${p.category}` : ""}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 p-2">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setOpen(false)}
            >
              {t("common.close") || "إغلاق"}
            </button>

            {value ? (
              <button
                type="button"
                className="text-xs text-red-600 hover:text-red-700"
                onClick={() => {
                  setSelected(null);
                  onChange("", null);
                }}
              >
                {t("common.clear") || "مسح"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InventoryRequestNewPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const qWarehouseId = sp.get("warehouse_id") || "";
  const qWorkOrderId = sp.get("work_order_id") || "";

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToastMsg(msg);
    setToastType(type);
    setToastOpen(true);
  }

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [whLoading, setWhLoading] = useState(false);

  const [warehouseId, setWarehouseId] = useState(qWarehouseId);
  const [workOrderId, setWorkOrderId] = useState(qWorkOrderId);

  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState<DraftLine[]>([]);
  const [linePartId, setLinePartId] = useState("");
  const [linePartObj, setLinePartObj] = useState<Part | null>(null);
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
      showToast(e?.response?.data?.message || e?.message || "Failed to load warehouses", "error");
    } finally {
      setWhLoading(false);
    }
  }

  useEffect(() => {
    loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (qWarehouseId && !warehouseId) setWarehouseId(qWarehouseId);
    if (qWorkOrderId && !workOrderId) setWorkOrderId(qWorkOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qWarehouseId, qWorkOrderId]);

  function addLine() {
    const pid = linePartId.trim();
    const qty = Number(lineQty);

    if (!isUuid(pid)) {
      showToast("اختار القطعة من البحث.", "error");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast("needed_qty لازم يكون > 0", "error");
      return;
    }

    setLines((prev) => {
      const idx = prev.findIndex((x) => x.part_id === pid);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          needed_qty: (copy[idx].needed_qty || 0) + Math.floor(qty),
          notes: lineNotes.trim() ? lineNotes.trim() : copy[idx].notes ?? null,
        };
        return copy;
      }

      return [
        ...prev,
        {
          part_id: pid,
          needed_qty: Math.floor(qty),
          notes: lineNotes.trim() ? lineNotes.trim() : null,
          part_name: linePartObj?.name ?? null,
          part_number: linePartObj?.part_number ?? null,
        },
      ];
    });

    setLinePartId("");
    setLinePartObj(null);
    setLineQty(1);
    setLineNotes("");
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const canSubmit = useMemo(() => {
    if (!isUuid(warehouseId)) return false;
    if (workOrderId && !isUuid(workOrderId)) return false;
    if (!lines.length) return false;
    return true;
  }, [warehouseId, workOrderId, lines]);

  async function createRequest() {
    if (!canSubmit) {
      showToast("تأكد من اختيار المخزن وإضافة سطور.", "error");
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

      showToast("✅ تم إنشاء الطلب", "success");

      if (createdId) router.replace(`/inventory/requests/${createdId}`);
      else router.replace("/inventory/requests");
    } catch (e: any) {
      showToast(e?.response?.data?.message || e?.message || "Failed to create request", "error");
    } finally {
      setSaving(false);
    }
  }

  const linesColumns: DataTableColumn<DraftLine>[] = [
    {
      key: "part",
      label: "Part",
      render: (l) => (
        <div>
          <div className="font-semibold text-gray-900">{l.part_name || "—"}</div>
          <div className="text-xs text-gray-500">
            {l.part_number ? `PN: ${l.part_number} • ` : ""}
            <span className="font-mono">{shortId(l.part_id)}</span>
          </div>
        </div>
      ),
    },
    { key: "needed_qty", label: "Needed", render: (l) => String(l.needed_qty) },
    { key: "notes", label: "Notes", render: (l) => <span className="text-gray-700">{l.notes || "—"}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (_l, ) => null, // placeholder; DataTable wants per-row render below
    },
  ];

  // ✅ We need per-row actions: implement via render on the column using index
  // We'll pass a derived rows array with __idx
  const rowsWithIdx = useMemo(() => lines.map((l, i) => ({ ...l, __idx: i } as any)), [lines]);

  const linesColumnsWithActions: DataTableColumn<any>[] = [
    linesColumns[0],
    linesColumns[1],
    linesColumns[2],
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <Button variant="danger" onClick={() => removeLine(r.__idx)}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />

      <PageHeader
        title={t("inventory.requestsTitle") || "Inventory Requests"}
        subtitle={t("inventory.createNewRequest") || "Create New Request"}
        actions={
          <>
            <Link href="/inventory/requests">
              <Button variant="secondary">← {t("common.back") || "Back"}</Button>
            </Link>
            <Button variant="secondary" onClick={loadWarehouses} disabled={whLoading}>
              {whLoading ? (t("common.loading") || "Loading") : (t("common.refresh") || "Refresh")}
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-sm text-gray-500 font-mono">
            warehouse_id: {warehouseId ? shortId(warehouseId) : "—"}{" "}
            {workOrderId ? ` • work_order_id: ${shortId(workOrderId)}` : ""}
          </div>

          <Button
            variant="primary"
            onClick={createRequest}
            disabled={!canSubmit || saving}
            isLoading={saving}
          >
            {t("inventory.createRequest") || "Create Request"}
          </Button>
        </div>

        {!canSubmit ? (
          <div className="mt-2 text-xs text-gray-500">ℹ️ لازم تختار warehouse + تضيف lines</div>
        ) : null}
      </Card>

      <Card title="Request Info">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Label>warehouse</Label>
            <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">{whLoading ? "Loading…" : "Select warehouse"}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.id}
                </option>
              ))}
            </Select>
            {warehouseId && !isUuid(warehouseId) ? (
              <div className="mt-1 text-xs text-red-700">⚠ warehouse_id غير صحيح</div>
            ) : null}
          </div>

          <div>
            <Label>work_order_id (optional)</Label>
            <TextInput
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              placeholder="uuid"
            />
            {workOrderId && !isUuid(workOrderId) ? (
              <div className="mt-1 text-xs text-red-700">⚠ work_order_id غير صحيح</div>
            ) : null}
          </div>

          <div>
            <Label>notes (optional)</Label>
            <TextInput
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("common.optional") || "Optional"}
            />
          </div>
        </div>
      </Card>

      <Card
        title="Lines"
        right={
          <div className="text-xs text-gray-500">
            Count: <span className="font-semibold text-gray-900">{lines.length}</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Part (search)</Label>
            <PartSearchSelect
              value={linePartId}
              onChange={(pid, p) => {
                setLinePartId(pid);
                setLinePartObj(p || null);
              }}
              onError={(msg) => showToast(msg, "error")}
              placeholder="ابحث باسم القطعة أو Part Number…"
            />
            {linePartId ? (
              <div className="mt-1 text-[11px] text-gray-500 font-mono">part_id: {shortId(linePartId)}</div>
            ) : null}
          </div>

          <div>
            <Label>needed_qty</Label>
            <TextInput
              type="number"
              value={lineQty}
              onChange={(e) => setLineQty(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>line notes (optional)</Label>
            <TextInput
              value={lineNotes}
              onChange={(e) => setLineNotes(e.target.value)}
              placeholder={t("common.optional") || "Optional"}
            />
          </div>

          <div className="md:col-span-4 flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={addLine}>
              + Add line
            </Button>

            <Button variant="primary" onClick={createRequest} disabled={!canSubmit || saving} isLoading={saving}>
              {t("inventory.createRequest") || "Create Request"}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <DataTable
            columns={linesColumnsWithActions}
            rows={rowsWithIdx}
            loading={false}
            emptyTitle={t("common.noData") || "No lines yet"}
            emptyHint="ابدأ بإضافة Line من الأعلى."
            minWidthClassName="min-w-[900px]"
          />
        </div>
      </Card>
    </div>
  );
}