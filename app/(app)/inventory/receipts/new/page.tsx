"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { createReceipt } from "@/src/lib/receipts.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type DraftItem = {
  part_id: string;
  internal_serial: string;
  manufacturer_serial: string;
  unit_cost: string; // keep string for input
  notes: string;
};

export default function NewReceiptPage() {
  const t = useT();
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(""); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<DraftItem[]>([
    { part_id: "", internal_serial: "", manufacturer_serial: "", unit_cost: "", notes: "" },
  ]);

  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" });

  const addRow = () => {
    setItems((p) => [...p, { part_id: "", internal_serial: "", manufacturer_serial: "", unit_cost: "", notes: "" }]);
  };

  const removeRow = (idx: number) => {
    setItems((p) => p.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<DraftItem>) => {
    setItems((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const hasAnyItem = useMemo(() => items.some((x) => x.part_id || x.internal_serial || x.manufacturer_serial), [items]);

  const onCreate = async () => {
    if (!warehouseId.trim()) return setToast({ open: true, message: t("receipts.errWarehouse"), type: "error" });
    if (!supplier.trim()) return setToast({ open: true, message: t("receipts.errSupplier"), type: "error" });
    if (!hasAnyItem) return setToast({ open: true, message: t("receipts.errItems"), type: "error" });

    // basic client validation (server has strict validation anyway)
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.part_id.trim()) return setToast({ open: true, message: t("receipts.errPartId", { i: i + 1 }), type: "error" });
      if (!it.internal_serial.trim()) return setToast({ open: true, message: t("receipts.errInternalSerial", { i: i + 1 }), type: "error" });
      if (!it.manufacturer_serial.trim()) return setToast({ open: true, message: t("receipts.errManufacturerSerial", { i: i + 1 }), type: "error" });
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

  return (
    <div className="p-6 space-y-4">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((p) => ({ ...p, open: false }))} />

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
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="warehouse_id"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
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
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">{t("receipts.colPartId")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colInternalSerial")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colManufacturerSerial")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colUnitCost")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colNotes")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colRemove")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <input
                      value={it.part_id}
                      onChange={(e) => updateRow(idx, { part_id: e.target.value })}
                      placeholder="part_id"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={it.internal_serial}
                      onChange={(e) => updateRow(idx, { internal_serial: e.target.value })}
                      placeholder="INT-0001"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                    />
                  </td>
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
              ))}

              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={6}>
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
    </div>
  );
}
