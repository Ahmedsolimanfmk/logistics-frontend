"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { unwrapItems } from "@/src/lib/api";
import { listInventoryRequests, type InventoryRequest } from "@/src/lib/inventory.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

export default function InventoryRequestsPage() {
  const t = useT();

  const [status, setStatus] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [workOrderId, setWorkOrderId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InventoryRequest[]>([]);

  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listInventoryRequests({
        status: status || undefined,
        warehouse_id: warehouseId || undefined,
        work_order_id: workOrderId || undefined,
      });
      setRows(unwrapItems<InventoryRequest>(res));
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badge = (st?: string) => {
    const s = String(st || "").toUpperCase();
    const base = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";
    if (s === "PENDING") return <span className={cn(base, "border-yellow-400/30 text-yellow-200 bg-yellow-400/10")}>{s}</span>;
    if (s === "APPROVED") return <span className={cn(base, "border-blue-400/30 text-blue-200 bg-blue-400/10")}>{s}</span>;
    if (s === "REJECTED") return <span className={cn(base, "border-red-400/30 text-red-200 bg-red-400/10")}>{s}</span>;
    if (s === "ISSUED") return <span className={cn(base, "border-green-400/30 text-green-200 bg-green-400/10")}>{s}</span>;
    return <span className={cn(base, "border-white/15 text-slate-200 bg-white/5")}>{s || "—"}</span>;
  };

  const items = useMemo(() => rows || [], [rows]);

  return (
    <div className="p-6 space-y-4">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold">{t("inventory.requestsTitle")}</div>
          <div className="text-sm text-slate-400">{t("inventory.requestsSubtitle")}</div>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          {loading ? t("common.loading") : t("common.refresh")}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder={t("inventory.filterStatus")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
        <input
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          placeholder={t("inventory.filterWarehouseId")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
        <input
          value={workOrderId}
          onChange={(e) => setWorkOrderId(e.target.value)}
          placeholder={t("inventory.filterWorkOrderId")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={load}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          {t("common.search")}
        </button>
        <button
          onClick={() => {
            setStatus("");
            setWarehouseId("");
            setWorkOrderId("");
            setTimeout(load, 0);
          }}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          {t("common.reset")}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">{t("inventory.colId")}</th>
                <th className="text-left px-4 py-3">{t("inventory.colWarehouse")}</th>
                <th className="text-left px-4 py-3">{t("inventory.colStatus")}</th>
                <th className="text-left px-4 py-3">{t("inventory.colLines")}</th>
                <th className="text-left px-4 py-3">{t("inventory.colCreatedAt")}</th>
                <th className="text-left px-4 py-3">{t("inventory.colOpen")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{r.id}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-100">{r.warehouses?.name || "—"}</div>
                    <div className="text-xs text-slate-400">{r.warehouse_id}</div>
                  </td>
                  <td className="px-4 py-3">{badge(r.status)}</td>
                  <td className="px-4 py-3 text-slate-200">{r.lines?.length ?? 0}</td>
                  <td className="px-4 py-3 text-slate-300">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/inventory/requests/${r.id}`}
                      className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      {t("common.open")}
                    </Link>
                  </td>
                </tr>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={6}>
                    {t("common.noData")}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={6}>
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
