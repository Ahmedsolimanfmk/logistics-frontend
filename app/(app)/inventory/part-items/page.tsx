"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { unwrapItems } from "@/src/lib/api";
import { listPartItems, type PartItem } from "@/src/lib/partItems.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

export default function PartItemsPage() {
  const t = useT();

  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [partId, setPartId] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PartItem[]>([]);

  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listPartItems({
        q: q || undefined,
        warehouse_id: warehouseId || undefined,
        part_id: partId || undefined,
        status: status || undefined,
      });
      setRows(unwrapItems<PartItem>(res));
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badge = (st?: string) => {
    const s = String(st || "").toUpperCase();
    const base = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";
    if (s === "IN_STOCK") return <span className={cn(base, "border-green-400/30 text-green-200 bg-green-400/10")}>{s}</span>;
    if (s === "RESERVED") return <span className={cn(base, "border-yellow-400/30 text-yellow-200 bg-yellow-400/10")}>{s}</span>;
    if (s === "ISSUED") return <span className={cn(base, "border-blue-400/30 text-blue-200 bg-blue-400/10")}>{s}</span>;
    if (s === "INSTALLED") return <span className={cn(base, "border-purple-400/30 text-purple-200 bg-purple-400/10")}>{s}</span>;
    if (s === "SCRAPPED") return <span className={cn(base, "border-red-400/30 text-red-200 bg-red-400/10")}>{s}</span>;
    return <span className={cn(base, "border-white/15 text-slate-200 bg-white/5")}>{s || "—"}</span>;
  };

  const items = useMemo(() => rows || [], [rows]);

  return (
    <div className="p-6 space-y-4">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold">{t("partItems.title")}</div>
          <div className="text-sm text-slate-400">{t("partItems.subtitle")}</div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/inventory/issues/new-direct"
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-sm"
          >
            {t("partItems.directIssue")}
          </Link>

          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("partItems.filterQ")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
        <input
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          placeholder={t("partItems.filterWarehouseId")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
        <input
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          placeholder={t("partItems.filterPartId")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
        <input
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder={t("partItems.filterStatus")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={load} className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm">
          {t("common.search")}
        </button>
        <button
          onClick={() => {
            setQ(""); setWarehouseId(""); setPartId(""); setStatus("");
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
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">{t("partItems.colSerial")}</th>
                <th className="text-left px-4 py-3">{t("partItems.colStatus")}</th>
                <th className="text-left px-4 py-3">{t("partItems.colPart")}</th>
                <th className="text-left px-4 py-3">{t("partItems.colWarehouse")}</th>
                <th className="text-left px-4 py-3">{t("partItems.colReceivedAt")}</th>
                <th className="text-left px-4 py-3">{t("partItems.colLastMovedAt")}</th>
                <th className="text-left px-4 py-3">{t("partItems.colIds")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pi) => (
                <tr key={pi.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-slate-200">{pi.internal_serial}</div>
                    <div className="font-mono text-xs text-slate-400">{pi.manufacturer_serial}</div>
                  </td>
                  <td className="px-4 py-3">{badge(pi.status)}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-100">{pi.parts?.name || "—"}</div>
                    <div className="text-xs text-slate-400">{pi.parts?.brand || ""}</div>
                    <div className="text-xs text-slate-400 font-mono">{pi.part_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-100">{pi.warehouses?.name || "—"}</div>
                    <div className="text-xs text-slate-400 font-mono">{pi.warehouse_id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{fmtDate(pi.received_at)}</td>
                  <td className="px-4 py-3 text-slate-300">{fmtDate(pi.last_moved_at)}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-400 font-mono">id: {pi.id}</div>
                  </td>
                </tr>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={7}>
                    {t("common.noData")}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={7}>
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
