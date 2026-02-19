"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { unwrapItems } from "@/src/lib/api";
import { listReceipts, type InventoryReceipt } from "@/src/lib/receipts.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

const fmtMoney = (n: any) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n ?? 0));

export default function InventoryReceiptsPage() {
  const t = useT();

  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InventoryReceipt[]>([]);

  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listReceipts({
        status: status || undefined,
        warehouse_id: warehouseId || undefined,
      });
      setRows(unwrapItems<InventoryReceipt>(res));
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
    if (s === "DRAFT") return <span className={cn(base, "border-yellow-400/30 text-yellow-200 bg-yellow-400/10")}>{s}</span>;
    if (s === "POSTED") return <span className={cn(base, "border-green-400/30 text-green-200 bg-green-400/10")}>{s}</span>;
    if (s === "CANCELLED") return <span className={cn(base, "border-red-400/30 text-red-200 bg-red-400/10")}>{s}</span>;
    return <span className={cn(base, "border-white/15 text-slate-200 bg-white/5")}>{s || "—"}</span>;
  };

  const items = useMemo(() => rows || [], [rows]);

  return (
    <div className="p-6 space-y-4">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold">{t("receipts.title")}</div>
          <div className="text-sm text-slate-400">{t("receipts.subtitle")}</div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/inventory/receipts/new"
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-sm"
          >
            {t("receipts.new")}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder={t("receipts.filterStatus")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
        <input
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          placeholder={t("receipts.filterWarehouseId")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={load} className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm">
          {t("common.search")}
        </button>
        <button
          onClick={() => {
            setStatus(""); setWarehouseId("");
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
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">{t("receipts.colId")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colStatus")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colWarehouse")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colSupplier")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colInvoice")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colItems")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colTotal")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colCreatedAt")}</th>
                <th className="text-left px-4 py-3">{t("receipts.colOpen")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{r.id}</td>
                  <td className="px-4 py-3">{badge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-100">{r.warehouses?.name || "—"}</div>
                    <div className="text-xs text-slate-400 font-mono">{r.warehouse_id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{r.supplier_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{r.invoice_no || "—"}</div>
                    <div className="text-xs text-slate-400">{r.invoice_date ? String(r.invoice_date).slice(0, 10) : "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{r.items?.length ?? 0}</td>
                  <td className="px-4 py-3 text-slate-200">{r.total_amount == null ? "—" : fmtMoney(r.total_amount)}</td>
                  <td className="px-4 py-3 text-slate-300">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/inventory/receipts/${r.id}`}
                      className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      {t("common.open")}
                    </Link>
                  </td>
                </tr>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={9}>
                    {t("common.noData")}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={9}>
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
