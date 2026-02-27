"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { unwrapItems } from "@/src/lib/api";
import { listIssues, type InventoryIssue } from "@/src/lib/issues.api";

// ✅ Design System
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
// لو عندك FiltersBar استخدمه، لو مش موجود سيبه:
// import { FiltersBar } from "@/src/components/ui/FiltersBar";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function StatusBadge({ value }: { value?: string | null }) {
  const s = String(value || "").toUpperCase();
  const base = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";
  if (s === "DRAFT") return <span className={cn(base, "border-yellow-400/30 text-yellow-200 bg-yellow-400/10")}>{s}</span>;
  if (s === "POSTED") return <span className={cn(base, "border-green-400/30 text-green-200 bg-green-400/10")}>{s}</span>;
  if (s === "CANCELLED") return <span className={cn(base, "border-red-400/30 text-red-200 bg-red-400/10")}>{s}</span>;
  return <span className={cn(base, "border-white/15 text-slate-200 bg-white/5")}>{s || "—"}</span>;
}

export default function InventoryIssuesPage() {
  const t = useT();

  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InventoryIssue[]>([]);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const items = useMemo(() => rows || [], [rows]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listIssues({
        status: status || undefined,
        warehouse_id: warehouseId || undefined,
        request_id: requestId || undefined,
        work_order_id: workOrderId || undefined,
      });
      setRows(unwrapItems<InventoryIssue>(res));
    } catch (e: any) {
      setToast({ open: true, message: e?.response?.data?.message || e?.message || t("common.failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setStatus("");
    setWarehouseId("");
    setRequestId("");
    setWorkOrderId("");
    setTimeout(load, 0);
  };

  return (
    <div className="p-6 space-y-4 text-white">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title={t("issues.title") || "أذون الصرف"}
        subtitle={t("issues.subtitle") || "إدارة وإصدار أذون الصرف من المخزن"}
        actions={
          <div className="flex gap-2">
            <Link href="/inventory/issues/new">
              <Button variant="secondary">{t("issues.new") || "إذن صرف جديد"}</Button>
            </Link>
            <Button variant="secondary" onClick={load} isLoading={loading}>
              {t("common.refresh") || "تحديث"}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">{t("issues.filterStatus") || "الحالة"}</div>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="DRAFT / POSTED / ..."
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none text-slate-100"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">{t("issues.filterWarehouseId") || "warehouse_id"}</div>
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="uuid"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none text-slate-100"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">{t("issues.filterRequestId") || "request_id"}</div>
            <input
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="uuid"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none text-slate-100"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">{t("issues.filterWorkOrderId") || "work_order_id"}</div>
            <input
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              placeholder="uuid"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none text-slate-100"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={load} isLoading={loading}>
            {t("common.search") || "بحث"}
          </Button>
          <Button variant="secondary" onClick={reset} disabled={loading}>
            {t("common.reset") || "إعادة ضبط"}
          </Button>

          <div className="ml-auto text-xs text-slate-400 self-center">
            {t("common.count") || "العدد"}: <span className="text-slate-200 font-semibold">{items.length}</span>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-white/5 text-slate-200">
                <tr>
                  <th className="text-left px-4 py-3">{t("issues.colId") || "ID"}</th>
                  <th className="text-left px-4 py-3">{t("issues.colStatus") || "الحالة"}</th>
                  <th className="text-left px-4 py-3">{t("issues.colWarehouse") || "المخزن"}</th>
                  <th className="text-left px-4 py-3">{t("issues.colRequest") || "الطلب"}</th>
                  <th className="text-left px-4 py-3">{t("issues.colWorkOrder") || "أمر الشغل"}</th>
                  <th className="text-left px-4 py-3">{t("issues.colLines") || "البنود"}</th>
                  <th className="text-left px-4 py-3">{t("issues.colCreatedAt") || "تاريخ الإنشاء"}</th>
                  <th className="text-left px-4 py-3">{t("issues.colOpen") || "فتح"}</th>
                </tr>
              </thead>

              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{shortId(r.id)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-100">{r.warehouses?.name || "—"}</div>
                      <div className="text-xs text-slate-400 font-mono">{shortId(r.warehouse_id)}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-200">{r.request_id ? shortId(r.request_id) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-200">{r.work_order_id ? shortId(r.work_order_id) : "—"}</td>
                    <td className="px-4 py-3 text-slate-200">{r.inventory_issue_lines?.length ?? 0}</td>
                    <td className="px-4 py-3 text-slate-300">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/issues/${r.id}`}
                        className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        {t("common.open") || "فتح"}
                      </Link>
                    </td>
                  </tr>
                ))}

                {!loading && items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={8}>
                      {t("common.noData") || "لا توجد بيانات"}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={8}>
                      {t("common.loading") || "جاري التحميل..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}