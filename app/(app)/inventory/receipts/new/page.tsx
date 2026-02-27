"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { apiGet, apiPost, unwrapItems } from "@/src/lib/api";
import { createReceipt } from "@/src/lib/receipts.api";

// ✅ Design System
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type Warehouse = { id: string; name?: string | null; location?: string | null };
type Part = {
  id: string;
  part_number: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
};

type DraftItem = {
  part_id: string;
  internal_serial: string;
  manufacturer_serial: string;
  unit_cost: string;
  notes: string;
};

function genInternalSerial(partId: string, rowIdx: number) {
  const p = (partId || "PART").slice(0, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ts = Date.now().toString(36).slice(-6).toUpperCase();
  return `${p}-${ts}-${rowIdx + 1}-${rand}`;
}

function suggestPartNumber(name: string) {
  const base = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) return "";
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${base.slice(0, 18)}-${suffix}`;
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

// ======================
// Local DS Inputs (Light)
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
// Modal Shell (Light DS)
// ======================
function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
          <div className="font-semibold text-gray-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4">{children}</div>

        {footer ? <div className="px-4 py-3 border-t border-gray-200">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function NewReceiptPage() {
  const t = useT();
  const router = useRouter();

  // header
  const [warehouseId, setWarehouseId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  // data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [partQ, setPartQ] = useState("");

  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const [items, setItems] = useState<DraftItem[]>([
    { part_id: "", internal_serial: "", manufacturer_serial: "", unit_cost: "", notes: "" },
  ]);

  // ✅ Catalog modal
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partSaving, setPartSaving] = useState(false);

  const [newPartNumber, setNewPartNumber] = useState("");
  const [newPartName, setNewPartName] = useState("");
  const [newPartBrand, setNewPartBrand] = useState("");
  const [newPartCategory, setNewPartCategory] = useState("");
  const [newPartUnit, setNewPartUnit] = useState("");
  const [newPartMinStock, setNewPartMinStock] = useState("");

  // ✅ Warehouse modal
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [warehouseSaving, setWarehouseSaving] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState("");
  const [newWarehouseLocation, setNewWarehouseLocation] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet<any>("/inventory/warehouses");
        const ws = unwrapItems<Warehouse>(res);
        setWarehouses(ws);
        if (ws.length === 1) setWarehouseId(ws[0].id);
      } catch (e: any) {
        setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadWarehouses = async (opts?: { selectId?: string }) => {
    try {
      const res = await apiGet<any>("/inventory/warehouses");
      const ws = unwrapItems<Warehouse>(res);
      setWarehouses(ws);

      if (opts?.selectId) {
        setWarehouseId(opts.selectId);
      } else if (ws.length === 1 && !warehouseId) {
        setWarehouseId(ws[0].id);
      }
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    }
  };

  const createWarehouseQuick = async () => {
    const nm = newWarehouseName.trim();
    const loc = newWarehouseLocation.trim();

    if (!nm) {
      setToast({ open: true, message: "اسم المخزن مطلوب", type: "error" });
      return;
    }

    setWarehouseSaving(true);
    try {
      const payload = { name: nm, location: loc ? loc : null };
      const created = await apiPost<Warehouse>("/inventory/warehouses", payload);

      setToast({ open: true, message: "تمت إضافة المخزن ✅", type: "success" });

      setWarehouses((prev) => {
        const exists =
          prev.some((x) => x.id === created.id) ||
          prev.some((x) => x.name && created.name && x.name === created.name);
        return exists ? prev : [created, ...prev];
      });

      if (created?.id) setWarehouseId(created.id);

      setWarehouseModalOpen(false);
      setNewWarehouseName("");
      setNewWarehouseLocation("");
    } catch (e: any) {
      const msg =
        e?.response?.status === 409
          ? "اسم المخزن موجود بالفعل"
          : e?.response?.data?.message || e?.message || t("common.failed");

      setToast({ open: true, message: msg, type: "error" });
    } finally {
      setWarehouseSaving(false);
    }
  };

  const searchParts = async () => {
    if (!warehouseId.trim()) {
      setToast({ open: true, message: t("receipts.errWarehouse"), type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiGet<any>("/inventory/parts", { q: partQ.trim() || undefined });
      setParts(unwrapItems<Part>(res));
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setItems((p) => [
      ...p,
      { part_id: "", internal_serial: "", manufacturer_serial: "", unit_cost: "", notes: "" },
    ]);
  };

  const removeRow = (idx: number) => {
    setItems((p) => p.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<DraftItem>) => {
    setItems((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const partById = useMemo(() => {
    const m = new Map<string, Part>();
    for (const p of parts) m.set(p.id, p);
    return m;
  }, [parts]);

  const hasAnyItem = useMemo(() => items.some((x) => x.part_id || x.manufacturer_serial), [items]);

  const onPickPart = (rowIdx: number, part_id: string) => {
    const serial = genInternalSerial(part_id, rowIdx);
    updateRow(rowIdx, { part_id, internal_serial: serial });
  };

  const regenSerial = (rowIdx: number) => {
    const pid = items[rowIdx]?.part_id || "";
    if (!pid) return;
    updateRow(rowIdx, { internal_serial: genInternalSerial(pid, rowIdx) });
  };

  const onCreate = async () => {
    if (!warehouseId.trim()) return setToast({ open: true, message: t("receipts.errWarehouse"), type: "error" });
    if (!supplier.trim()) return setToast({ open: true, message: t("receipts.errSupplier"), type: "error" });
    if (!hasAnyItem) return setToast({ open: true, message: t("receipts.errItems"), type: "error" });

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.part_id.trim())
        return setToast({ open: true, message: t("receipts.errPartId", { i: i + 1 }), type: "error" });
      if (!it.manufacturer_serial.trim())
        return setToast({
          open: true,
          message: t("receipts.errManufacturerSerial", { i: i + 1 }),
          type: "error",
        });
      if (!it.internal_serial.trim())
        return setToast({ open: true, message: t("common.failed"), type: "error" });
    }

    setLoading(true);
    try {
      const created = await createReceipt({
        warehouse_id: warehouseId.trim(),
        supplier_name: supplier.trim(),
        invoice_no: invoiceNo.trim() ? invoiceNo.trim() : null,
        invoice_date: invoiceDate.trim() ? invoiceDate.trim() : null,
        items: items.map((it) => ({
          part_id: it.part_id.trim(),
          internal_serial: it.internal_serial.trim(),
          manufacturer_serial: it.manufacturer_serial.trim(),
          unit_cost: it.unit_cost.trim() === "" ? null : it.unit_cost.trim(),
          notes: it.notes.trim() ? it.notes.trim() : null,
        })),
      });

      setToast({ open: true, message: t("receipts.createdOk"), type: "success" });
      router.push(`/inventory/receipts/${created.id}`);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCatalogModal = () => {
    const q = partQ.trim();
    if (q && !newPartName) setNewPartName(q);

    if (!newPartNumber && (newPartName || q)) {
      setNewPartNumber(suggestPartNumber(newPartName || q));
    }
    setPartModalOpen(true);
  };

  const createPartQuick = async () => {
    const pn = newPartNumber.trim();
    const nm = newPartName.trim();

    if (!pn) return setToast({ open: true, message: "كود القطعة (part_number) مطلوب", type: "error" });
    if (!nm) return setToast({ open: true, message: "اسم القطعة مطلوب", type: "error" });

    const ms = newPartMinStock.trim() === "" ? null : Number(newPartMinStock);

    if (ms != null && (!Number.isFinite(ms) || ms < 0)) {
      setToast({ open: true, message: "min_stock لازم يكون رقم >= 0", type: "error" });
      return;
    }

    setPartSaving(true);
    try {
      const payload: any = {
        part_number: pn,
        name: nm,
        brand: newPartBrand.trim() || null,
        category: newPartCategory.trim() || null,
        unit: newPartUnit.trim() || null,
        min_stock: ms == null ? null : Math.floor(ms),
      };

      const created = await apiPost<Part>("/inventory/parts", payload);

      setParts((p) => {
        const exists = p.some((x) => x.id === created.id || x.part_number === created.part_number);
        return exists ? p : [created, ...p];
      });

      setItems((prev) => {
        const idx = prev.findIndex((x) => !x.part_id);
        if (idx === -1) {
          const rowIdx = prev.length;
          return [
            ...prev,
            {
              part_id: created.id,
              internal_serial: genInternalSerial(created.id, rowIdx),
              manufacturer_serial: "",
              unit_cost: "",
              notes: "",
            },
          ];
        }
        return prev.map((r, i) =>
          i === idx ? { ...r, part_id: created.id, internal_serial: genInternalSerial(created.id, i) } : r
        );
      });

      setToast({ open: true, message: "تمت إضافة القطعة للكتالوج ✅", type: "success" });

      setPartModalOpen(false);
      setNewPartNumber("");
      setNewPartName("");
      setNewPartBrand("");
      setNewPartCategory("");
      setNewPartUnit("");
      setNewPartMinStock("");
    } catch (e: any) {
      const msg =
        e?.response?.status === 409
          ? "هذا الكود موجود بالفعل (part_number already exists)"
          : e?.response?.data?.message || e?.message || t("common.failed");

      setToast({ open: true, message: msg, type: "error" });
    } finally {
      setPartSaving(false);
    }
  };

  // ✅ DataTable rows with idx for actions
  const itemsWithIdx = useMemo(() => items.map((x, i) => ({ ...x, __idx: i } as any)), [items]);

  const columns: DataTableColumn<any>[] = [
    {
      key: "part_id",
      label: t("receipts.colPartId"),
      className: "min-w-[320px]",
      render: (r) => {
        const idx = r.__idx as number;
        const it = items[idx];
        const p = it.part_id ? partById.get(it.part_id) : null;

        return (
          <div className="space-y-1">
            <Select value={it.part_id} onChange={(e) => onPickPart(idx, e.target.value)}>
              <option value="">{t("receipts.selectPart") || "اختر part"}</option>
              {parts.map((pp) => (
                <option key={pp.id} value={pp.id}>
                  {pp.name ? `${pp.name}${pp.brand ? ` (${pp.brand})` : ""} — ${shortId(pp.id)}` : shortId(pp.id)}
                </option>
              ))}
            </Select>
            {p?.part_number ? (
              <div className="text-xs text-gray-500">
                كود: <span className="font-mono text-gray-700">{p.part_number}</span>
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "part_name",
      label: "اسم القطعة",
      className: "min-w-[220px]",
      render: (r) => {
        const it = items[r.__idx];
        const p = it.part_id ? partById.get(it.part_id) : null;
        return (
          <div>
            <div className="text-gray-900 font-semibold">{p?.name || "—"}</div>
            <div className="text-xs text-gray-500">{p?.brand || ""}</div>
          </div>
        );
      },
    },
    {
      key: "internal_serial",
      label: t("receipts.colInternalSerial"),
      className: "min-w-[320px]",
      render: (r) => {
        const idx = r.__idx as number;
        const it = items[idx];
        return (
          <div className="flex items-center gap-2">
            <TextInput value={it.internal_serial} readOnly placeholder="AUTO" className="bg-gray-50" />
            <Button variant="secondary" disabled={!it.part_id} onClick={() => regenSerial(idx)}>
              إعادة
            </Button>
          </div>
        );
      },
    },
    {
      key: "manufacturer_serial",
      label: t("receipts.colManufacturerSerial"),
      className: "min-w-[220px]",
      render: (r) => {
        const idx = r.__idx as number;
        const it = items[idx];
        return (
          <TextInput
            value={it.manufacturer_serial}
            onChange={(e) => updateRow(idx, { manufacturer_serial: e.target.value })}
            placeholder="MFG-999"
          />
        );
      },
    },
    {
      key: "unit_cost",
      label: t("receipts.colUnitCost"),
      className: "min-w-[160px]",
      render: (r) => {
        const idx = r.__idx as number;
        const it = items[idx];
        return (
          <TextInput
            value={it.unit_cost}
            onChange={(e) => updateRow(idx, { unit_cost: e.target.value })}
            placeholder="1200"
          />
        );
      },
    },
    {
      key: "notes",
      label: t("receipts.colNotes"),
      className: "min-w-[240px]",
      render: (r) => {
        const idx = r.__idx as number;
        const it = items[idx];
        return (
          <TextInput
            value={it.notes}
            onChange={(e) => updateRow(idx, { notes: e.target.value })}
            placeholder={t("receipts.notesPh")}
          />
        );
      },
    },
    {
      key: "remove",
      label: t("receipts.colRemove"),
      render: (r) => (
        <Button variant="danger" disabled={items.length <= 1} onClick={() => removeRow(r.__idx)}>
          {t("receipts.remove")}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title={t("receipts.newTitle")}
        subtitle={t("receipts.newSubtitle")}
        actions={
          <Button variant="secondary" onClick={() => router.back()}>
            {t("common.prev")}
          </Button>
        }
      />

      {/* Header fields */}
      <Card title="Header">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{t("receipts.warehouseId")}</Label>
            <div className="flex gap-2">
              <div className="w-full">
                <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                  <option value="">{t("common.all")}</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name ? `${w.name} — ${shortId(w.id)}` : shortId(w.id)}
                    </option>
                  ))}
                </Select>
              </div>

              <Button variant="secondary" onClick={() => setWarehouseModalOpen(true)}>
                + إضافة مخزن
              </Button>
            </div>
          </div>

          <div>
            <Label>{t("receipts.supplier")}</Label>
            <TextInput
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder={t("receipts.supplierPh")}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{t("receipts.invoiceNo")}</Label>
            <TextInput
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder={t("receipts.invoiceNoPh")}
            />
          </div>

          <div>
            <Label>{t("receipts.invoiceDate")}</Label>
            <TextInput type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Label>{t("common.search")}</Label>
            <TextInput
              value={partQ}
              onChange={(e) => setPartQ(e.target.value)}
              placeholder="ابحث عن قطعة (كود/اسم/براند...)"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={searchParts} isLoading={loading}>
              بحث القطع
            </Button>
            <Button variant="primary" onClick={openCatalogModal}>
              + إضافة للكتالوج
            </Button>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          * الـ internal serial بيتولد تلقائيًا — والمستخدم بس يدخل Serial المصنع من المورد.
        </div>
      </Card>

      {/* Items table */}
      <DataTable
        title={t("receipts.items")}
        subtitle={`Rows: ${items.length}`}
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={addRow}>
              {t("receipts.addRow")}
            </Button>
            <Button variant="primary" onClick={onCreate} isLoading={loading}>
              {t("receipts.createDraft")}
            </Button>
          </div>
        }
        columns={columns}
        rows={itemsWithIdx}
        loading={false}
        emptyTitle={t("common.noData")}
        emptyHint="أضف صف جديد ثم اختر القطعة."
        minWidthClassName="min-w-[1400px]"
      />

      {/* ✅ Add-to-catalog modal */}
      <ModalShell
        open={partModalOpen}
        title="إضافة قطعة للكتالوج"
        onClose={() => setPartModalOpen(false)}
        footer={
          <div className="flex flex-wrap gap-2 justify-start">
            <Button variant="primary" onClick={createPartQuick} isLoading={partSaving}>
              حفظ في الكتالوج
            </Button>
            <Button variant="secondary" onClick={() => setPartModalOpen(false)} disabled={partSaving}>
              {t("common.cancel")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>كود القطعة (part_number) *</Label>
            <div className="flex gap-2">
              <TextInput value={newPartNumber} onChange={(e) => setNewPartNumber(e.target.value)} placeholder="مثال: FILT-OIL-001" />
              <Button
                variant="secondary"
                onClick={() => setNewPartNumber(suggestPartNumber(newPartName || partQ))}
                disabled={partSaving}
              >
                اقتراح
              </Button>
            </div>
          </div>

          <div>
            <Label>اسم القطعة *</Label>
            <TextInput value={newPartName} onChange={(e) => setNewPartName(e.target.value)} placeholder="مثال: فلتر زيت" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>البراند (اختياري)</Label>
              <TextInput value={newPartBrand} onChange={(e) => setNewPartBrand(e.target.value)} placeholder="مثال: MANN" />
            </div>
            <div>
              <Label>التصنيف (اختياري)</Label>
              <TextInput value={newPartCategory} onChange={(e) => setNewPartCategory(e.target.value)} placeholder="مثال: Filters" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>الوحدة (اختياري)</Label>
              <TextInput value={newPartUnit} onChange={(e) => setNewPartUnit(e.target.value)} placeholder="مثال: pcs" />
            </div>
            <div>
              <Label>حد أدنى للمخزون (اختياري)</Label>
              <TextInput value={newPartMinStock} onChange={(e) => setNewPartMinStock(e.target.value)} placeholder="مثال: 5" />
            </div>
          </div>

          <div className="text-xs text-gray-500">
            * لازم تدخل <span className="font-mono">part_number</span> لأنه Required في الباك-إند الحالي.
          </div>
        </div>
      </ModalShell>

      {/* ✅ Add Warehouse Modal */}
      <ModalShell
        open={warehouseModalOpen}
        title="إضافة مخزن"
        onClose={() => setWarehouseModalOpen(false)}
        footer={
          <div className="flex flex-wrap gap-2 justify-start">
            <Button variant="primary" onClick={createWarehouseQuick} isLoading={warehouseSaving}>
              حفظ المخزن
            </Button>
            <Button variant="secondary" onClick={() => setWarehouseModalOpen(false)} disabled={warehouseSaving}>
              {t("common.cancel")}
            </Button>
            <Button variant="ghost" onClick={() => reloadWarehouses()} disabled={warehouseSaving}>
              تحديث القائمة
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>اسم المخزن *</Label>
            <TextInput value={newWarehouseName} onChange={(e) => setNewWarehouseName(e.target.value)} placeholder="مثال: Main Warehouse" />
          </div>

          <div>
            <Label>الموقع (اختياري)</Label>
            <TextInput value={newWarehouseLocation} onChange={(e) => setNewWarehouseLocation(e.target.value)} placeholder="مثال: Cairo / 6th October / ..." />
          </div>

          <div className="text-xs text-gray-500">
            * سيتم إنشاء المخزن عبر <span className="font-mono">POST /inventory/warehouses</span> ثم اختياره تلقائيًا.
          </div>
        </div>
      </ModalShell>
    </div>
  );
}