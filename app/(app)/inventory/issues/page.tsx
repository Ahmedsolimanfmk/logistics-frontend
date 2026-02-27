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
import { StatusBadge } from "@/src/components/ui/StatusBadge";

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

const inputCls =
"w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none " +
  "text-gray-900 placeholder:text-gray-400 focus:border-gray-300";
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

  const reset = () => {
    setStatus("");
    setWarehouseId("");
    setRequestId("");
    setWorkOrderId("");
    setTimeout(load, 0);
  };

  return (
    <div className="space-y-4">
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
            <div className="text-xs text-gray-500 mb-1">{t("issues.filterStatus") || "الحالة"}</div>
            <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="DRAFT / POSTED / ..." className={inputCls} />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">{t("issues.filterWarehouseId") || "warehouse_id"}</div>
            <input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="uuid" className={inputCls} />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">{t("issues.filterRequestId") || "request_id"}</div>
            <input value={requestId} onChange={(e) => setRequestId(e.target.value)} placeholder="uuid" className={inputCls} />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">{t("issues.filterWorkOrderId") || "work_order_id"}</div>
            <input value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} placeholder="uuid" className={inputCls} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Button variant="primary" onClick={load} isLoading={loading}>
            {t("common.search") || "بحث"}
          </Button>
          <Button variant="secondary" onClick={reset} disabled={loading}>
            {t("common.reset") || "إعادة ضبط"}
          </Button>

          <div className="ml-auto text-xs text-gray-500">
            {t("common.count") || "العدد"}: <span className="text-gray-700 font-semibold">{items.length}</span>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-hidden rounded-2xl border border-border-gray-200">
          <div className="overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
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
                  <tr key={r.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700/600">{shortId(r.id)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{r.warehouses?.name || "—"}</div>
                      <div className="text-xs text-gray-500 font-mono">{shortId(r.warehouse_id)}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.request_id ? shortId(r.request_id) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.work_order_id ? shortId(r.work_order_id) : "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.inventory_issue_lines?.length ?? 0}</td>
                    <td className="px-4 py-3 text-gray-700/600">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/issues/${r.id}`} className="inline-flex px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white/10">
                        {t("common.open") || "فتح"}
                      </Link>
                    </td>
                  </tr>
                ))}

                {!loading && items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={8}>
                      {t("common.noData") || "لا توجد بيانات"}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={8}>
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