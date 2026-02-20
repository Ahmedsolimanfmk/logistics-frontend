"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { apiGet } from "@/src/lib/api";

type Receipt = any;

export default function ReceiptDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<Receipt | null>(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const r = await apiGet<any>(`/inventory/receipts/${id}`);
        setRow(r);
      } catch (e: any) {
        setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="p-6 space-y-4">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-bold">تفاصيل الإضافة المخزنية</div>
          <div className="text-sm text-slate-400 font-mono">{id}</div>
        </div>

        <button onClick={() => router.back()} className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm">
          {t("common.prev")}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {loading && <div className="text-slate-400">{t("common.loading")}</div>}

        {!loading && !row && <div className="text-slate-400">{t("common.noData")}</div>}

        {!loading && row && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
                <div className="text-xs text-slate-400">المخزن</div>
                <div className="text-slate-100">{row?.warehouses?.name || "—"}</div>
                <div className="text-xs text-slate-500 font-mono">{row?.warehouse_id}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
                <div className="text-xs text-slate-400">المورد</div>
                <div className="text-slate-100">{row?.supplier_name || "—"}</div>
                <div className="text-xs text-slate-500">{row?.invoice_no || ""}</div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
              <div className="text-xs text-slate-400">الحالة</div>
              <div className="text-slate-100">{row?.status || "—"}</div>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="bg-white/5 px-4 py-3 font-semibold">العناصر</div>
              <div className="overflow-auto">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-white/5 text-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3">Part</th>
                      <th className="text-left px-4 py-3">Internal</th>
                      <th className="text-left px-4 py-3">MFG</th>
                      <th className="text-left px-4 py-3">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(row?.items || row?.receipt_items || []).map((x: any, i: number) => (
                      <tr key={i} className="border-t border-white/10">
                        <td className="px-4 py-3">
                          <div className="text-slate-100">{x?.parts?.name || "—"}</div>
                          <div className="text-xs text-slate-500 font-mono">{x?.part_id || x?.parts_id}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-200">{x?.internal_serial || x?.part_items?.internal_serial || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-200">{x?.manufacturer_serial || x?.part_items?.manufacturer_serial || "—"}</td>
                        <td className="px-4 py-3 text-slate-200">{x?.unit_cost ?? "—"}</td>
                      </tr>
                    ))}

                    {(row?.items || row?.receipt_items || []).length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-slate-400" colSpan={4}>
                          {t("common.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}