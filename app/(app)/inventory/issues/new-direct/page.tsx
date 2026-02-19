"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { unwrapItems } from "@/src/lib/api";
import { listPartItems, type PartItem } from "@/src/lib/partItems.api";
import { createIssueDraft } from "@/src/lib/issues.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function NewDirectIssuePage() {
  const t = useT();
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [stock, setStock] = useState<PartItem[]>([]);
  const [selected, setSelected] = useState<Record<string, PartItem>>({}); // part_item_id -> item

  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" });

  const loadStock = async () => {
    if (!warehouseId.trim()) {
      setToast({ open: true, message: t("directIssue.errWarehouse"), type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await listPartItems({
        warehouse_id: warehouseId.trim(),
        status: "IN_STOCK",
        q: q.trim() || undefined,
      });
      setStock(unwrapItems<PartItem>(res));
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

  useEffect(() => {
    // load nothing by default; user picks warehouse first
  }, []);

  const toggle = (it: PartItem) => {
    setSelected((p) => {
      const next = { ...p };
      if (next[it.id]) delete next[it.id];
      else next[it.id] = it;
      return next;
    });
  };

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const selectedCount = selectedList.length;

  const onCreateDraft = async () => {
    if (!warehouseId.trim()) return setToast({ open: true, message: t("directIssue.errWarehouse"), type: "error" });
    if (!workOrderId.trim()) return setToast({ open: true, message: t("directIssue.errWorkOrder"), type: "error" });
    if (!notes.trim() || notes.trim().length < 5) return setToast({ open: true, message: t("directIssue.errNotes"), type: "error" });
    if (selectedCount === 0) return setToast({ open: true, message: t("directIssue.errPick"), type: "error" });

    setLoading(true);
    try {
      const created = await createIssueDraft({
        warehouse_id: warehouseId.trim(),
        work_order_id: workOrderId.trim(),
        request_id: null,
        notes: notes.trim(),
        lines: selectedList.map((pi) => ({
          part_id: pi.part_id,
          part_item_id: pi.id,
          qty: 1,
        })),
      });

      setToast({ open: true, message: t("directIssue.createdOk"), type: "success" });
      router.push(`/inventory/issues/${created.id}`);
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
          <div className="text-xl font-bold">{t("directIssue.title")}</div>
          <div className="text-sm text-slate-400">{t("directIssue.subtitle")}</div>
        </div>

        <button
          onClick={() => router.back()}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          {t("common.prev")}
        </button>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">{t("directIssue.warehouseId")}</div>
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="warehouse_id"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">{t("directIssue.workOrderId")}</div>
            <input
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              placeholder="work_order_id"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">{t("directIssue.notes")}</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("directIssue.notesPh")}
            className="w-full min-h-[90px] rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">{t("directIssue.search")}</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("directIssue.searchPh")}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={loadStock}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-sm"
          >
            {t("directIssue.loadStock")}
          </button>
        </div>

        <div className="text-xs text-slate-400">
          {t("directIssue.selectedCount", { n: selectedCount })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCreateDraft}
            disabled={loading}
            className={cn(
              "px-3 py-2 rounded-xl border text-sm",
              loading ? "border-white/10 bg-white/5 text-slate-500" : "border-white/10 bg-white/10 hover:bg-white/15"
            )}
          >
            {loading ? t("common.loading") : t("directIssue.createDraft")}
          </button>
        </div>
      </div>

      {/* Stock list */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="bg-white/5 px-4 py-3 font-semibold">{t("directIssue.stockTitle")}</div>
        <div className="overflow-auto">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">{t("directIssue.colPick")}</th>
                <th className="text-left px-4 py-3">{t("directIssue.colSerial")}</th>
                <th className="text-left px-4 py-3">{t("directIssue.colPart")}</th>
                <th className="text-left px-4 py-3">{t("directIssue.colWarehouse")}</th>
                <th className="text-left px-4 py-3">{t("directIssue.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((pi) => {
                const isSel = !!selected[pi.id];
                return (
                  <tr key={pi.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(pi)}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-sm",
                          isSel ? "border-green-400/30 bg-green-400/10 text-green-200" : "border-white/10 bg-white/5 hover:bg-white/10"
                        )}
                      >
                        {isSel ? t("directIssue.picked") : t("directIssue.pick")}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-200">{pi.internal_serial}</div>
                      <div className="font-mono text-xs text-slate-400">{pi.manufacturer_serial}</div>
                      <div className="font-mono text-[11px] text-slate-500">{pi.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-100">{pi.parts?.name || "—"}</div>
                      <div className="text-xs text-slate-400">{pi.parts?.brand || ""}</div>
                      <div className="text-xs text-slate-400 font-mono">{pi.part_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-100">{pi.warehouses?.name || "—"}</div>
                      <div className="text-xs text-slate-400 font-mono">{pi.warehouse_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{pi.status}</td>
                  </tr>
                );
              })}

              {!loading && stock.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={5}>
                    {t("directIssue.noStock")}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={5}>
                    {t("common.loading")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
