"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { arLedgerService } from "@/src/services/ar-ledger.service";
import type { ArLedgerInvoice } from "@/src/types/ar.types";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("ar-EG");
}

function fmtMoney(v: unknown) {
  return Number(v || 0).toFixed(2);
}

export default function LedgerClientPage() {
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);

  const [client, setClient] = useState<{ id: string; name?: string | null } | null>(null);
  const [summary, setSummary] = useState({
    total_invoiced: 0,
    total_paid: 0,
    balance: 0,
  });
  const [rows, setRows] = useState<ArLedgerInvoice[]>([]);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type?: "success" | "error";
  }>({
    open: false,
    message: "",
    type: "success",
  });

  async function load() {
    const id = String(clientId || "").trim();
    if (!id) {
      setToast({ open: true, message: "أدخل client id", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await arLedgerService.getClientLedger(id);
      setClient(res.client || null);
      setSummary(res.summary);
      setRows(res.invoices || []);
    } catch (e: any) {
      setClient(null);
      setSummary({
        total_invoiced: 0,
        total_paid: 0,
        balance: 0,
      });
      setRows([]);
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to load ledger",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  const columns: DataTableColumn<ArLedgerInvoice>[] = useMemo(
    () => [
      {
        key: "invoice_no",
        label: "رقم الفاتورة",
        render: (r) => r.invoice_no || "—",
      },
      {
        key: "issue_date",
        label: "تاريخ الإصدار",
        render: (r) => fmtDate(r.issue_date),
      },
      {
        key: "due_date",
        label: "تاريخ الاستحقاق",
        render: (r) => fmtDate(r.due_date),
      },
      {
        key: "status",
        label: "الحالة",
        render: (r) => r.status || "—",
      },
      {
        key: "total_amount",
        label: "إجمالي الفاتورة",
        render: (r) => fmtMoney(r.total_amount),
      },
      {
        key: "paid_amount",
        label: "المسدد",
        render: (r) => fmtMoney(r.paid_amount),
      },
      {
        key: "remaining_amount",
        label: "المتبقي",
        render: (r) => <span className="font-semibold">{fmtMoney(r.remaining_amount)}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="دفتر أستاذ العميل (AR Ledger)"
        subtitle="استعراض الفواتير المعتمدة والمدفوعة جزئيًا والرصيد المتبقي لكل عميل."
      />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <div className="text-xs text-slate-500 mb-1">Client ID</div>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="uuid"
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={load} isLoading={loading}>
              {loading ? "جاري التحميل..." : "تحميل"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setClientId("");
                setClient(null);
                setSummary({
                  total_invoiced: 0,
                  total_paid: 0,
                  balance: 0,
                });
                setRows([]);
              }}
            >
              إعادة ضبط
            </Button>
          </div>
        </div>
      </Card>

      {client ? (
        <Card>
          <div className="text-sm text-slate-600">
            العميل: <span className="font-semibold text-slate-900">{client.name || client.id}</span>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="إجمالي الفواتير" value={fmtMoney(summary.total_invoiced)} />
        <KpiCard label="إجمالي المسدد" value={fmtMoney(summary.total_paid)} />
        <KpiCard label="الرصيد" value={fmtMoney(summary.balance)} />
      </div>

      <DataTable<ArLedgerInvoice>
        title="دفتر الأستاذ"
        subtitle={client ? `العميل: ${client.name || client.id}` : "أدخل client id ثم حمّل البيانات"}
        rows={rows}
        columns={columns}
        loading={loading}
        emptyTitle="لا توجد فواتير"
        emptyHint="حمّل ledger لعميل صحيح أو تأكد من وجود فواتير APPROVED / PARTIALLY_PAID / PAID."
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