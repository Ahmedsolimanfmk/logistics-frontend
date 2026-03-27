"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useT } from "@/src/i18n/useT";
import {
  getArPaymentById,
  getClientLedger,
  allocateArPayment,
  deleteArPaymentAllocation,
  type ArPaymentAllocation,
} from "@/src/lib/ar.api";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("ar-EG");
}

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function PaymentDetailsClientPage({ id }: { id: string }) {
  const t = useT();
  const paymentId = String(id || "");

  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<any>(null);

  // ✅ allocations
  const [allocations, setAllocations] = useState<ArPaymentAllocation[]>([]);
  const [totals, setTotals] = useState<{ allocated: number; remaining: number }>({
    allocated: 0,
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

  // ---------------------------
  // Allocate UI
  // ---------------------------
  const [allocOpen, setAllocOpen] = useState(false);
  const [allocLoading, setAllocLoading] = useState(false);

  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerInvoices, setLedgerInvoices] = useState<
    Array<{ id: string; invoice_no: string; remaining_amount: number; total_amount: number; status?: any }>
  >([]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [allocAmount, setAllocAmount] = useState("");

  const remainingPayment = Math.max(0, toNum(totals?.remaining));

  const selectedInvoice = useMemo(() => {
    return ledgerInvoices.find((x) => String(x.id) === String(selectedInvoiceId)) || null;
  }, [ledgerInvoices, selectedInvoiceId]);

  const invoiceRemaining = Math.max(0, toNum(selectedInvoice?.remaining_amount));

  const amountNum = useMemo(() => {
    const n = Number(allocAmount);
    return Number.isFinite(n) ? n : 0;
  }, [allocAmount]);

  const allocError = useMemo(() => {
    if (!selectedInvoiceId) return "اختر فاتورة";
    if (!allocAmount || amountNum <= 0) return "ادخل مبلغ صحيح";
    if (amountNum > remainingPayment) return "المبلغ أكبر من المتبقي في الدفعة";
    if (amountNum > invoiceRemaining) return "المبلغ أكبر من المتبقي في الفاتورة";
    return "";
  }, [selectedInvoiceId, allocAmount, amountNum, remainingPayment, invoiceRemaining]);

  async function load() {
    if (!paymentId) return;
    setLoading(true);
    try {
      const res = await getArPaymentById(paymentId);
      setPayment(res?.payment ?? null);
setAllocations(Array.isArray(res?.allocations) ? res.allocations : []);
setTotals(res?.totals ?? { allocated: 0, remaining: 0 });
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "Failed to load payment details",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadClientInvoices() {
    const clientId = payment?.client_id;
    if (!clientId) return;

    setLedgerLoading(true);
    try {
      const ledger = await getClientLedger(String(clientId));
      const invs = (ledger?.invoices || [])
        .filter((x) => toNum((x as any).remaining_amount) > 0)
        .map((x) => ({
          id: String((x as any).id),
          invoice_no: String((x as any).invoice_no || (x as any).id),
          remaining_amount: toNum((x as any).remaining_amount),
          total_amount: toNum((x as any).total_amount),
          status: (x as any).status,
        }));

      setLedgerInvoices(invs);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "فشل تحميل فواتير العميل",
        type: "error",
      });
    } finally {
      setLedgerLoading(false);
    }
  }

  async function onAllocate() {
    if (allocError) {
      setToast({ open: true, message: allocError, type: "error" });
      return;
    }
    if (!paymentId) return;

    setAllocLoading(true);
    try {
      await allocateArPayment(paymentId, {
        invoice_id: String(selectedInvoiceId),
        amount: Number(allocAmount),
      });

      setToast({ open: true, message: "تم تخصيص المبلغ بنجاح", type: "success" });

      setSelectedInvoiceId("");
      setAllocAmount("");

      await load();
      await loadClientInvoices();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "فشل تخصيص الدفعة",
        type: "error",
      });
    } finally {
      setAllocLoading(false);
    }
  }

  function askDeleteAllocation(allocationId: string) {
    setConfirm({
      open: true,
      title: "حذف التخصيص",
      desc: "هل أنت متأكد أنك تريد حذف هذا التخصيص؟ سيتم تحديث الإجماليات بعد الحذف.",
      tone: "danger",
      confirmText: "حذف",
      action: async () => {
        try {
          await deleteArPaymentAllocation(paymentId, allocationId);
          setToast({ open: true, message: "تم حذف التخصيص بنجاح", type: "success" });

          // refresh details + allocations
          await load();

          // refresh invoice list if form is open (remaining changes)
          if (allocOpen) {
            await loadClientInvoices();
          }
        } catch (e: any) {
          setToast({ open: true, message: e?.message || "فشل حذف التخصيص", type: "error" });
        }
      },
    });
  }

  useEffect(() => {
    load();
  }, [paymentId]);

  const cols: DataTableColumn<ArPaymentAllocation>[] = useMemo(
    () => [
      {
        key: "invoice_no",
        label: "الفاتورة",
        render: (r) => (r as any).invoice?.invoice_no || (r as any).ar_invoices?.invoice_no || "—",
      },
      {
        key: "inv_status",
        label: "حالة الفاتورة",
        render: (r) => (r as any).invoice?.status || (r as any).ar_invoices?.status || "—",
      },
      {
        key: "inv_total",
        label: "إجمالي الفاتورة",
        render: (r) =>
          Number((r as any).invoice?.total_amount ?? (r as any).ar_invoices?.total_amount ?? 0).toFixed(2),
      },
      {
        key: "amount",
        label: "المخصص",
        render: (r) => Number((r as any).amount_allocated || 0).toFixed(2),
      },
      { key: "created", label: "تاريخ", render: (r) => fmtDate((r as any).created_at) },

      // ✅ actions
      {
        key: "actions",
        label: "إجراءات",
        headerClassName: "text-left",
        className: "text-left",
        render: (r) => {
          const allocId = String((r as any).id || "");
          return (
            <button
              className="px-3 py-1 rounded-xl border border-[rgb(var(--trex-border))] hover:opacity-80"
              onClick={(e) => {
                e.preventDefault?.();
                e.stopPropagation?.();
                if (!allocId) return;
                askDeleteAllocation(allocId);
              }}
            >
              حذف
            </button>
          );
        },
      },
    ],
    [t, paymentId, allocOpen]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="تفاصيل دفعة AR"
        subtitle={
          payment
            ? `العميل: ${payment.client?.name || payment.client_id} — المبلغ: ${Number(payment.amount || 0).toFixed(
                2
              )} — الحالة: ${payment.status}`
            : "تحميل..."
        }
      />

      {/* KPI cards (fixed: no glass/white) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[rgb(var(--trex-border))] bg-[rgb(var(--trex-card))] p-4">
          <div className="text-xs opacity-70">إجمالي الدفعة</div>
          <div className="text-lg font-semibold">{payment ? Number(payment.amount || 0).toFixed(2) : "—"}</div>
        </div>

        <div className="rounded-2xl border border-[rgb(var(--trex-border))] bg-[rgb(var(--trex-card))] p-4">
          <div className="text-xs opacity-70">المخصص</div>
          <div className="text-lg font-semibold">{Number(totals.allocated || 0).toFixed(2)}</div>
        </div>

        <div className="rounded-2xl border border-[rgb(var(--trex-border))] bg-[rgb(var(--trex-card))] p-4">
          <div className="text-xs opacity-70">المتبقي</div>
          <div className="text-lg font-semibold">{Number(totals.remaining || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Allocate Payment UI */}
      <div className="rounded-2xl border border-[rgb(var(--trex-border))] bg-[rgb(var(--trex-card))] p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-semibold">تخصيص دفعة على فاتورة</div>
            <div className="text-sm opacity-70">
              المتبقي في الدفعة: <span className="font-semibold">{Number(remainingPayment).toFixed(2)}</span>
            </div>
          </div>

          <button
            className="px-4 py-2 rounded-xl border border-[rgb(var(--trex-border))]"
            onClick={async () => {
              const next = !allocOpen;
              setAllocOpen(next);
              if (next) await loadClientInvoices();
            }}
          >
            {allocOpen ? "إخفاء" : "فتح الفورم"}
          </button>
        </div>

        {allocOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1 opacity-80">الفاتورة</label>
              <select
                className="w-full rounded-xl border border-[rgb(var(--trex-border))] bg-transparent px-3 py-2"
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                disabled={ledgerLoading || allocLoading}
              >
                <option value="">{ledgerLoading ? "جاري التحميل..." : "اختر فاتورة"}</option>

                {ledgerInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_no} — المتبقي: {Number(inv.remaining_amount).toFixed(2)}
                  </option>
                ))}
              </select>

              {selectedInvoice && (
                <div className="mt-2 text-xs opacity-75">
                  المتبقي في الفاتورة:{" "}
                  <span className="font-semibold">{Number(invoiceRemaining).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-80">المبلغ</label>
              <input
                className="w-full rounded-xl border border-[rgb(var(--trex-border))] bg-transparent px-3 py-2"
                value={allocAmount}
                onChange={(e) => setAllocAmount(e.target.value)}
                placeholder="مثال: 500"
                inputMode="decimal"
                disabled={allocLoading}
              />

              {allocError ? <div className="mt-2 text-xs text-red-500">{allocError}</div> : null}

              <div className="mt-2 flex gap-2">
                <button
                  className="px-3 py-2 rounded-xl border border-[rgb(var(--trex-border))]"
                  onClick={() => {
                    if (!selectedInvoice) return;
                    const max = Math.min(remainingPayment, invoiceRemaining);
                    setAllocAmount(String(max.toFixed(2)));
                  }}
                  disabled={!selectedInvoice || allocLoading}
                >
                  تخصيص أقصى مبلغ
                </button>
              </div>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                className="px-4 py-2 rounded-xl border border-[rgb(var(--trex-border))]"
                onClick={onAllocate}
                disabled={!!allocError || allocLoading}
              >
                {allocLoading ? "جاري التخصيص..." : "Allocate"}
              </button>
            </div>
          </div>
        )}
      </div>

      <DataTable
        title="تخصيصات الدفعة"
        subtitle="الفواتير التي تم تخصيصها على هذه الدفعة"
        rows={allocations}
        columns={cols}
        loading={loading}
        emptyTitle="لا توجد تخصيصات"
        emptyHint="لا توجد تخصيصات بعد. استخدم الفورم بالأعلى لتخصيص مبلغ على فاتورة."
      />

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((x) => ({ ...x, open: false }))} />

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