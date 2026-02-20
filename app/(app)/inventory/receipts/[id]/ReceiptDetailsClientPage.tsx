"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
// ✅ عدّل اسم الدالة حسب الموجود عندك داخل receipts.api.ts
import { getReceipt } from "@/src/lib/receipts.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function ReceiptDetailsClientPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any>(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  useEffect(() => {
    const boot = async () => {
      if (!id) {
        setToast({ open: true, message: "Missing receipt id", type: "error" });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const r = await getReceipt(id);
        setRow(r);
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

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
          <div className="text-xl font-bold">
            {t("receipts.detailsTitle") || "تفاصيل الإضافة المخزنية"}
          </div>
          <div className="text-sm text-slate-400 font-mono">{id}</div>
        </div>

        <button
          onClick={() => router.back()}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          {t("common.prev")}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {loading && <div className="text-slate-400">{t("common.loading")}</div>}

        {!loading && !row && (
          <div className="text-slate-400">{t("common.noData")}</div>
        )}

        {!loading && row && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Info label={t("common.status") || "الحالة"} value={row.status} />
              <Info label={t("receipts.invoiceNo") || "رقم الفاتورة"} value={row.invoice_no} />
              <Info label={t("receipts.vendor") || "المورد"} value={row.vendor_name || row.vendors?.name} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Info label={t("receipts.total") || "الإجمالي"} value={row.total_amount ?? row.amount ?? "—"} />
              <Info label={t("receipts.warehouse") || "المخزن"} value={row.warehouses?.name || row.warehouse_id} />
              <Info label={t("receipts.createdAt") || "تاريخ الإنشاء"} value={formatDate(row.created_at)} />
            </div>

            {/* لو عندك lines */}
            {Array.isArray(row.lines) && (
              <div className="rounded-2xl border border-white/10 overflow-hidden mt-4">
                <div className="bg-white/5 px-4 py-3 font-semibold">
                  {t("receipts.lines") || "بنود الإضافة"}
                </div>
                <div className="overflow-auto">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-white/5 text-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3">Part</th>
                        <th className="text-left px-4 py-3">Serial</th>
                        <th className="text-left px-4 py-3">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.lines.map((ln: any, idx: number) => (
                        <tr key={ln.id || idx} className="border-t border-white/10">
                          <td className="px-4 py-3">
                            <div className="text-slate-100">{ln.parts?.name || "—"}</div>
                            <div className="text-xs text-slate-400 font-mono">{ln.part_id}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-200">
                            {ln.part_items?.internal_serial ||
                              ln.part_items?.manufacturer_serial ||
                              ln.part_item_id ||
                              "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-200">{ln.qty ?? 1}</td>
                        </tr>
                      ))}
                      {row.lines.length === 0 && (
                        <tr>
                          <td className="px-4 py-6 text-slate-400" colSpan={3}>
                            {t("common.noData")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => router.push("/inventory/receipts")}
          className={cn(
            "px-3 py-2 rounded-xl border text-sm",
            "border-white/10 bg-white/10 hover:bg-white/15"
          )}
        >
          {t("receipts.backToList") || "الرجوع للقائمة"}
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-slate-100 break-words">{String(value ?? "—")}</div>
    </div>
  );
}

function formatDate(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ar-EG");
}
