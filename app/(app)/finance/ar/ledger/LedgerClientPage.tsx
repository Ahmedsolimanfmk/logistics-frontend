"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { useT } from "@/src/i18n/useT";
import { getClientLedger } from "@/src/lib/ar.api";

type LedgerInvoiceRow = {
  id: string;
  invoice_no: string;
  issue_date?: string | null;
  due_date?: string | null;
  status: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("ar-EG");
}

export default function LedgerClientPage() {
  const t = useT();

  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);

  const [client, setClient] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<LedgerInvoiceRow[]>([]);

  const [toast, setToast] = useState<{ open: boolean; message: string; type?: "success" | "error" }>({
    open: false,
    message: "",
    type: "success",
  });

  async function load() {
    const id = String(clientId || "").trim();
    if (!id) {
      setToast({ open: true, message: "اكتب Client ID أولاً", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res: any = await getClientLedger(id);
      setClient(res?.client || null);
      setSummary(res?.summary || null);
      setRows((res?.invoices || []) as LedgerInvoiceRow[]);
    } catch (e: any) {
      setToast({ open: true, message: e?.message || "Failed to load ledger", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const cols: DataTableColumn<LedgerInvoiceRow>[] = useMemo(
    () => [
      { key: "invoice_no", label: "الفاتورة", render: (r) => r.invoice_no || "—" },
      { key: "issue", label: "الإصدار", render: (r) => fmtDate(r.issue_date) },
      { key: "due", label: "الاستحقاق", render: (r) => fmtDate(r.due_date) },
      { key: "status", label: "الحالة", render: (r) => r.status },
      { key: "total", label: "إجمالي", render: (r) => Number(r.total_amount || 0).toFixed(2) },
      { key: "paid", label: "مدفوع", render: (r) => Number(r.paid_amount || 0).toFixed(2) },
      { key: "rem", label: "متبقي", render: (r) => Number(r.remaining_amount || 0).toFixed(2) },
    ],
    [t]
  );

  return (
    <div className="space-y-4">
      <PageHeader title="كشف حساب عميل (AR Ledger)" subtitle="عرض إجمالي الفواتير والمدفوعات والرصيد حسب العميل." />

      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
        <div className="flex-1">
          <div className="text-sm mb-1 opacity-80">Client ID</div>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="ضع client_id هنا"
            className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none"
          />
        </div>

        <Button className="h-10 px-4" onClick={load} isLoading={loading}>
          تحميل
        </Button>
      </div>

      {summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] p-4">
            <div className="text-xs opacity-70">إجمالي الفواتير</div>
            <div className="text-lg font-semibold">{Number(summary.total_invoiced || 0).toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] p-4">
            <div className="text-xs opacity-70">إجمالي المدفوع</div>
            <div className="text-lg font-semibold">{Number(summary.total_paid || 0).toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] p-4">
            <div className="text-xs opacity-70">الرصيد</div>
            <div className="text-lg font-semibold">{Number(summary.balance || 0).toFixed(2)}</div>
          </div>
        </div>
      ) : null}

      <DataTable
        title={client ? `فواتير العميل: ${client.name}` : "الفواتير"}
        subtitle="الفواتير (APPROVED / PARTIALLY_PAID / PAID)"
        rows={rows}
        columns={cols}
        loading={loading}
        emptyTitle="لا توجد بيانات"
        emptyHint="تأكد من client_id أو وجود فواتير معتمدة."
      />

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((x) => ({ ...x, open: false }))}
      />
    </div>
  );
}