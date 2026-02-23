"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { api, apiGet, unwrapItems } from "@/src/lib/api"; // ✅ api is needed for POST
import { createReceipt } from "@/src/lib/receipts.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type Warehouse = { id: string; name?: string | null };
type Part = { id: string; part_number: string; name: string; brand?: string | null; category?: string | null; unit?: string | null };

type DraftItem = {
  part_id: string;
  internal_serial: string;
  manufacturer_serial: string;
  unit_cost: string; // keep string for input
  notes: string;
};

function genInternalSerial(partId: string, rowIdx: number) {
  const p = (partId || "PART").slice(0, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ts = Date.now().toString(36).slice(-6).toUpperCase();
  return `${p}-${ts}-${rowIdx + 1}-${rand}`;
}

// optional helper: suggest part_number from name
function suggestPartNumber(name: string) {
  const base = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) return "";
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${base.slice(0, 18)}-${suffix}`; // keep it short-ish
}

export default function NewReceiptPage() {
  const t = useT();
  const router = useRouter();

  // header
  const [warehouseId, setWarehouseId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(""); // YYYY-MM-DD

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

  // load warehouses once
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

  // parts search
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
    setItems((p) => [...p, { part_id: "", internal_serial: "", manufacturer_serial: "", unit_cost: "", notes: "" }]);
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
        return setToast({ open: true, message: t("receipts.errManufacturerSerial", { i: i + 1 }), type: "error" });
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

  // ✅ open modal helper
  const openCatalogModal = () => {
    // prefill from search query
    const q = partQ.trim();
    if (q && !newPartName) setNewPartName(q);

    // suggest part_number if empty
    if (!newPartNumber && (newPartName || q)) {
      setNewPartNumber(suggestPartNumber(newPartName || q));
    }
    setPartModalOpen(true);
  };

  // ✅ create part
  const createPartQuick = async () => {
    const pn = newPartNumber.trim();
    const nm = newPartName.trim();

    if (!pn) return setToast({ open: true, message: "كود القطعة (part_number) مطلوب", type: "error" });
    if (!nm) return setToast({ open: true, message: "اسم القطعة مطلوب", type: "error" });

    // min_stock validation front
    const ms =
      newPartMinStock.trim() === ""
        ? null
        : Number(newPartMinStock);

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

      const created: Part = await api.post("/inventory/parts", payload);

      // add to list + auto select in first empty row
      setParts((p) => {
        // avoid duplicates in UI
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

      // close + reset
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

  return (
    <div className="p-6 space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-bold">{t("receipts.newTitle")}</div>
          <div className="text-sm text-slate-400">{t("receipts.newSubtitle")}</div>
        </div>

        <button
          onClick={() => router.back()}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          {t("common.prev")}
        </button>
      </div>

      {/* Header fields */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">{t("receipts.warehouseId")}</div>
            <select
  value={warehouseId}
  onChange={(e) => setWarehouseId(e.target.value)}
  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none text-slate-100"
>
  <option value="" style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>
    {t("common.all")}
  </option>
  {warehouses.map((w) => (
    <option key={w.id} value={w.id} style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>
      {w.name ? `${w.name} — ${w.id}` : w.id}
    </option>
  ))}
</select>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">{t("receipts.supplier")}</div>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder={t("receipts.supplierPh")}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">{t("receipts.invoiceNo")}</div>
            <input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder={t("receipts.invoiceNoPh")}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">{t("receipts.invoiceDate")}</div>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        {/* parts search + add catalog */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">{t("common.search")}</div>
            <input
              value={partQ}
              onChange={(e) => setPartQ(e.target.value)}
              placeholder="ابحث عن قطعة (كود/اسم/براند...)"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={searchParts}
              className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-sm"
            >
              بحث القطع
            </button>
            <button
              type="button"
              onClick={openCatalogModal}
              className="px-3 py-2 rounded-xl border border-white/10 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm"
            >
              + إضافة للكتالوج
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          * الـ internal serial بيتولد تلقائيًا — والمستخدم بس يدخل Serial المصنع من المورد.
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="bg-white/5 px-4 py-3 font-semibold flex items-center justify-between">
          <span>{t("receipts.items")}</span>
          <button
            onClick={addRow}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-sm"
          >
            {t("receipts.addRow")}
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">{t("receipts.colPartId")}</th>
                <th className="text-left px-4 py-3">اسم القطعة</th>
                <th className="text-left px-4 py-3">{t("receipts.colInternalSerial")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colManufacturerSerial")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colUnitCost")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colNotes")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colRemove")}</th>
              </tr>
            </thead>

            <tbody>
              {items.map((it, idx) => {
                const p = it.part_id ? partById.get(it.part_id) : null;
                return (
                  <tr key={idx} className="border-t border-white/10">
                    {/* part picker */}
                    <td className="px-4 py-3">
                      <select
  value={it.part_id}
  onChange={(e) => onPickPart(idx, e.target.value)}
  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none text-slate-100"
>
  <option value="" style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>
    {t("receipts.selectPart") || "اختر part"}
  </option>

  {parts.map((pp) => (
    <option
      key={pp.id}
      value={pp.id}
      style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}
    >
      {pp.name ? `${pp.name} (${pp.brand || ""}) — ${pp.id}` : pp.id}
    </option>
  ))}
</select>
                      {p?.part_number ? (
                        <div className="mt-1 text-xs text-slate-400">
                          كود: <span className="font-mono text-slate-300">{p.part_number}</span>
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-100">{p?.name || "—"}</div>
                      <div className="text-xs text-slate-400">{p?.brand || ""}</div>
                    </td>

                    {/* internal serial auto */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <input
                          value={it.internal_serial}
                          readOnly
                          placeholder="AUTO"
                          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none opacity-90"
                        />
                        <button
                          type="button"
                          onClick={() => regenSerial(idx)}
                          disabled={!it.part_id}
                          className={cn(
                            "px-3 py-2 rounded-xl border text-sm",
                            !it.part_id
                              ? "border-white/10 bg-white/5 text-slate-500"
                              : "border-white/10 bg-white/10 hover:bg-white/15"
                          )}
                        >
                          إعادة
                        </button>
                      </div>
                    </td>

                    {/* manufacturer serial from supplier */}
                    <td className="px-4 py-3">
                      <input
                        value={it.manufacturer_serial}
                        onChange={(e) => updateRow(idx, { manufacturer_serial: e.target.value })}
                        placeholder="MFG-999"
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={it.unit_cost}
                        onChange={(e) => updateRow(idx, { unit_cost: e.target.value })}
                        placeholder="1200"
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={it.notes}
                        onChange={(e) => updateRow(idx, { notes: e.target.value })}
                        placeholder={t("receipts.notesPh")}
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeRow(idx)}
                        disabled={items.length <= 1}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-sm",
                          items.length <= 1
                            ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                            : "border-white/10 bg-white/10 hover:bg-white/15"
                        )}
                      >
                        {t("receipts.remove")}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={7}>
                    {t("common.noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2">
          <button
            onClick={onCreate}
            disabled={loading}
            className={cn(
              "px-3 py-2 rounded-xl border text-sm",
              loading ? "border-white/10 bg-white/5 text-slate-500" : "border-white/10 bg-white/10 hover:bg-white/15"
            )}
          >
            {loading ? t("common.loading") : t("receipts.createDraft")}
          </button>
        </div>
      </div>

      {/* ✅ Add-to-catalog modal */}
      {partModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPartModalOpen(false)} />

          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">إضافة قطعة للكتالوج</div>
              <button
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                onClick={() => setPartModalOpen(false)}
              >
                {t("common.cancel")}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <Field
                label="كود القطعة (part_number) *"
                value={newPartNumber}
                onChange={setNewPartNumber}
                ph="مثال: FILT-OIL-001"
                rightAction={
                  <button
                    type="button"
                    onClick={() => setNewPartNumber(suggestPartNumber(newPartName || partQ))}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                  >
                    اقتراح
                  </button>
                }
              />

              <Field label="اسم القطعة *" value={newPartName} onChange={setNewPartName} ph="مثال: فلتر زيت" />
              <Field label="البراند (اختياري)" value={newPartBrand} onChange={setNewPartBrand} ph="مثال: MANN" />
              <Field label="التصنيف (اختياري)" value={newPartCategory} onChange={setNewPartCategory} ph="مثال: Filters" />
              <Field label="الوحدة (اختياري)" value={newPartUnit} onChange={setNewPartUnit} ph="مثال: pcs" />
              <Field
                label="حد أدنى للمخزون (اختياري)"
                value={newPartMinStock}
                onChange={setNewPartMinStock}
                ph="مثال: 5"
              />

              <div className="flex gap-2 pt-2">
                <button
                  disabled={partSaving}
                  onClick={createPartQuick}
                  className={cn(
                    "px-3 py-2 rounded-xl border text-sm",
                    partSaving
                      ? "border-white/10 bg-white/5 text-slate-500"
                      : "border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20"
                  )}
                >
                  {partSaving ? t("common.loading") : "حفظ في الكتالوج"}
                </button>

                <button
                  type="button"
                  onClick={() => setPartModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                >
                  {t("common.cancel")}
                </button>
              </div>

              <div className="text-xs text-slate-400">
                * لازم تدخل <span className="font-mono">part_number</span> لأنه Required في الباك-إند الحالي.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ph,
  rightAction,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ph?: string;
  rightAction?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex gap-2 items-center">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ph}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
        {rightAction}
      </div>
    </div>
  );
}