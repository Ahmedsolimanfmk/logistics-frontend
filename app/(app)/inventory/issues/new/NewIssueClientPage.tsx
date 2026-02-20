"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { getInventoryRequest, type InventoryRequest } from "@/src/lib/inventory.api";
import { createIssueDraft } from "@/src/lib/issues.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function NewIssueClientPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const requestId = sp.get("requestId") || "";

  const [loading, setLoading] = useState(false);
  const [reqRow, setReqRow] = useState<InventoryRequest | null>(null);

  const [warehouseId, setWarehouseId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const reservedItems = useMemo(() => {
    const res = reqRow?.reservations || [];
    return res.map((r) => r.part_items).filter(Boolean).map((x) => x!);
  }, [reqRow]);

  useEffect(() => {
    const boot = async () => {
      if (!requestId) return;

      setLoading(true);
      try {
        const r = await getInventoryRequest(requestId);
        setReqRow(r);
        setWarehouseId(r.warehouse_id || "");
        setWorkOrderId(r.work_order_id || "");
      } catch (e: any) {
        setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
      } finally {
        setLoading(false);
      }
    };
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const onCreate = async () => {
    if (!warehouseId) return setToast({ open: true, message: t("issues.errWarehouse"), type: "error" });
    if (!workOrderId) return setToast({ open: true, message: t("issues.errWorkOrder"), type: "error" });
    if (!requestId) return setToast({ open: true, message: t("issues.errRequestId"), type: "error" });
    if (reservedItems.length === 0) return setToast({ open: true, message: t("issues.errNoReserved"), type: "error" });

    setLoading(true);
    try {
      const created = await createIssueDraft({
        warehouse_id: warehouseId,
        work_order_id: workOrderId,
        request_id: requestId,
        notes: notes || null,
        lines: reservedItems.map((pi) => ({
          part_id: pi.part_id,
          part_item_id: pi.id,
          qty: 1,
        })),
      });

      setToast({ open: true, message: t("issues.createdOk"), type: "success" });
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

  const showRequest = !!requestId;

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
          <div className="text-xl font-bold">{t("issues.newTitle")}</div>
          <div className="text-sm text-slate-400">{t("issues.newSubtitle")}</div>
        </div>

        <button
          onClick={() => router.back()}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          {t("common.prev")}
        </button>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        {showRequest && (
          <div className="text-sm">
            <div className="text-slate-400">{t("issues.requestId")}</div>
            <div className="font-mono text-xs text-slate-200">{requestId}</div>
            <div className="mt-1 text-xs text-slate-400">
              {t("issues.reservedCount", { n: reservedItems.length })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">{t("issues.warehouseId")}</div>
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="warehouse_id"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">{t("issues.workOrderId")}</div>
            <input
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              placeholder="work_order_id"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">{t("issues.notes")}</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("issues.notesPh")}
            className="w-full min-h-[90px] rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCreate}
            disabled={loading}
            className={cn(
              "px-3 py-2 rounded-xl border text-sm",
              loading
                ? "border-white/10 bg-white/5 text-slate-500"
                : "border-white/10 bg-white/10 hover:bg-white/15"
            )}
          >
            {loading ? t("common.loading") : t("issues.createDraft")}
          </button>
        </div>
      </div>

      {/* Preview reserved serials */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="bg-white/5 px-4 py-3 font-semibold">{t("issues.linesPreview")}</div>
        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">{t("issues.colPart")}</th>
                <th className="text-left px-4 py-3">{t("issues.colSerial")}</th>
                <th className="text-left px-4 py-3">{t("issues.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {reservedItems.map((pi) => (
                <tr key={pi.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <div className="text-slate-100">{pi.parts?.name || "—"}</div>
                    <div className="text-xs text-slate-400 font-mono">{pi.part_id}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">
                    {pi.internal_serial || pi.manufacturer_serial || pi.id}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{pi.status}</td>
                </tr>
              ))}

              {!loading && reservedItems.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={3}>
                    {showRequest ? t("issues.noReserved") : t("issues.noRequest")}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={3}>
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
