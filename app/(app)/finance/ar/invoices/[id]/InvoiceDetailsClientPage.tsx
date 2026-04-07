"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { arInvoicesService } from "@/src/services/ar-invoices.service";
import type { ArInvoice, ArInvoiceTripLine } from "@/src/types/ar.types";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("ar-EG");
}

function fmtMoney(v: unknown) {
  return Number(v || 0).toFixed(2);
}

export default function InvoiceDetailsClientPage({ id }: { id: string }) {
  const invoiceId = String(id || "");

  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<ArInvoice | null>(null);
  const [totals, setTotals] = useState({
    allocated_posted: 0,
    remaining: 0,
  });

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type?: "success" | "error";
  }>({
    open: false,
    message: "",
    type: "success",
  });

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    desc?: string;
    action?: () => Promise<void>;
    tone?: "danger" | "warning" | "info";
    confirmText?: string;
  }>({ open: false, title: "" });

  async function load() {
    if (!invoiceId) return;

    setLoading(true);
    try {
      const res = await arInvoicesService.getById(invoiceId);
      setInvoice(res.invoice || null);
      setTotals(
        res.totals || {
          allocated_posted: 0,
          remaining: 0,
        }
      );
    } catch (e: any) {
      setInvoice(null);
      setTotals({
        allocated_posted: 0,
        remaining: 0,
      });
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to load invoice details",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [invoiceId]);

  const lines = useMemo(() => invoice?.invoice_trip_lines || [], [invoice]);

  const cols: DataTableColumn<ArInvoiceTripLine>[] = useMemo(
    () => [
      {
        key: "trip_id",
        label: "الرحلة",
        render: (r) => r.trips?.trip_code || r.trip_id || "—",
      },
      {
        key: "trip_status",
        label: "حالة الرحلة",
        render: (r) => r.trips?.status || "—",
      },
      {
        key: "trip_financial_status",
        label: "الحالة المالية",
        render: (r) => r.trips?.financial_status || "—",
      },
      {
        key: "amount",
        label: "القيمة",
        render: (r) => fmtMoney(r.amount),
      },
      {
        key: "notes",
        label: "ملاحظات",
        render: (r) => r.notes || "—",
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="تفاصيل فاتورة AR"
        subtitle={
          invoice
            ? `الفاتورة: ${invoice.invoice_no || invoice.id} — العميل: ${invoice.clients?.name || invoice.client_id || "—"}`
            : "تحميل..."
        }
        actions={
          <div className="flex gap-2">
            <Link href="/finance/ar/invoices">
              <Button variant="secondary">رجوع</Button>
            </Link>

            <Button variant="secondary" onClick={load} isLoading={loading}>
              {loading ? "جاري التحديث..." : "تحديث"}
            </Button>

            {invoice?.status === "DRAFT" ? (
              <Button
                onClick={() =>
                  setConfirm({
                    open: true,
                    title: "إرسال الفاتورة؟",
                    desc: "سيتم تحويل الفاتورة إلى SUBMITTED.",
                    tone: "info",
                    confirmText: "إرسال",
                    action: async () => {
                      await arInvoicesService.submit(invoice.id);
                      setToast({ open: true, message: "تم الإرسال", type: "success" });
                      await load();
                    },
                  })
                }
              >
                إرسال
              </Button>
            ) : null}

            {invoice?.status === "SUBMITTED" ? (
              <>
                <Button
                  onClick={() =>
                    setConfirm({
                      open: true,
                      title: "اعتماد الفاتورة؟",
                      desc: "سيتم تحويل الفاتورة إلى APPROVED.",
                      tone: "warning",
                      confirmText: "اعتماد",
                      action: async () => {
                        await arInvoicesService.approve(invoice.id);
                        setToast({ open: true, message: "تم الاعتماد", type: "success" });
                        await load();
                      },
                    })
                  }
                >
                  اعتماد
                </Button>

                <Button
                  variant="danger"
                  onClick={() =>
                    setConfirm({
                      open: true,
                      title: "رفض الفاتورة؟",
                      desc: "سيتم تحويل الفاتورة إلى REJECTED.",
                      tone: "danger",
                      confirmText: "رفض",
                      action: async () => {
                        await arInvoicesService.reject(invoice.id, {
                          rejection_reason: "Rejected from UI",
                        });
                        setToast({ open: true, message: "تم الرفض", type: "success" });
                        await load();
                      },
                    })
                  }
                >
                  رفض
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiCard label="المبلغ" value={fmtMoney(invoice?.amount)} />
        <KpiCard label="الضريبة" value={fmtMoney(invoice?.vat_amount)} />
        <KpiCard label="الإجمالي" value={fmtMoney(invoice?.total_amount)} />
        <KpiCard label="الحالة" value={invoice?.status || "—"} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiCard label="المخصص المسجل" value={fmtMoney(totals.allocated_posted)} />
        <KpiCard label="المتبقي" value={fmtMoney(totals.remaining)} />
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">العميل</div>
            <div className="font-medium">{invoice?.clients?.name || invoice?.client_id || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">العقد</div>
            <div className="font-medium">
              {invoice?.client_contracts?.contract_no || invoice?.contract_id || "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">رقم الفاتورة</div>
            <div className="font-medium">{invoice?.invoice_no || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">تاريخ الإصدار</div>
            <div className="font-medium">{fmtDate(invoice?.issue_date)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">تاريخ الاستحقاق</div>
            <div className="font-medium">{fmtDate(invoice?.due_date)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">أنشئت في</div>
            <div className="font-medium">{fmtDate(invoice?.created_at)}</div>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-slate-500">ملاحظات</div>
            <div className="font-medium">{invoice?.notes || "—"}</div>
          </div>

          {invoice?.rejection_reason ? (
            <div className="md:col-span-3">
              <div className="text-xs text-red-500">سبب الرفض</div>
              <div className="font-medium text-red-600">{invoice.rejection_reason}</div>
            </div>
          ) : null}
        </div>
      </Card>

      <DataTable<ArInvoiceTripLine>
        title="Trip Lines"
        subtitle={`عدد السطور: ${lines.length}`}
        rows={lines}
        columns={cols}
        loading={loading}
        emptyTitle="لا توجد Trip Lines"
        emptyHint="هذه الفاتورة لا تحتوي على سطور رحلات."
      />

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((x) => ({ ...x, open: false }))}
      />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.desc}
        tone={confirm.tone || "danger"}
        confirmText={confirm.confirmText || "تأكيد"}
        cancelText="إلغاء"
        onClose={() => setConfirm((x) => ({ ...x, open: false }))}
        onConfirm={async () => {
          const fn = confirm.action;
          setConfirm((x) => ({ ...x, open: false }));
          if (fn) await fn();
        }}
      />
    </div>
  );
}