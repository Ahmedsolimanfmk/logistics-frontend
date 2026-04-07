"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { arInvoicesService } from "@/src/services/ar-invoices.service";

type TripLineForm = {
  trip_id: string;
  amount: string;
  notes: string;
};

export default function NewInvoiceClientPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [tripLines, setTripLines] = useState<TripLineForm[]>([]);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type?: "success" | "error";
  }>({
    open: false,
    message: "",
    type: "success",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  const canSubmit = useMemo(() => {
    if (!clientId.trim()) return false;
    if (tripLines.length > 0) {
      return tripLines.every(
        (line) => line.trip_id.trim() && Number(line.amount || 0) >= 0
      );
    }
    return Number(amount || 0) >= 0 && amount !== "";
  }, [clientId, tripLines, amount]);

  function addTripLine() {
    setTripLines((prev) => [...prev, { trip_id: "", amount: "", notes: "" }]);
  }

  function updateTripLine(index: number, patch: Partial<TripLineForm>) {
    setTripLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeTripLine(index: number) {
    setTripLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!canSubmit) {
      setToast({ open: true, message: "أكمل الحقول المطلوبة", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const created = await arInvoicesService.create({
        client_id: clientId.trim(),
        contract_id: contractId.trim() || undefined,
        issue_date: issueDate || undefined,
        due_date: dueDate || undefined,
        amount: tripLines.length === 0 ? Number(amount) : undefined,
        vat_amount: vatAmount !== "" ? Number(vatAmount) : undefined,
        notes: notes.trim() || undefined,
        trip_lines:
          tripLines.length > 0
            ? tripLines.map((line) => ({
                trip_id: line.trip_id.trim(),
                amount: Number(line.amount || 0),
                notes: line.notes.trim() || undefined,
              }))
            : undefined,
      });

      setToast({ open: true, message: "تم إنشاء الفاتورة", type: "success" });
      router.push(`/finance/ar/invoices/${created.id}`);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to create invoice",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="فاتورة AR جديدة"
        subtitle="يمكنك إنشاء فاتورة مباشرة بمبلغ يدوي أو بناءً على trip lines."
        actions={
          <div className="flex gap-2">
            <Link href="/finance/ar/invoices">
              <Button variant="secondary">رجوع</Button>
            </Link>
            <Button onClick={() => setConfirmOpen(true)} isLoading={loading} disabled={loading}>
              {loading ? "جاري الإنشاء..." : "إنشاء"}
            </Button>
          </div>
        }
      />

      <Card title="بيانات الفاتورة">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Client ID *</div>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
              placeholder="uuid"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Contract ID</div>
            <input
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
              placeholder="uuid"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Issue Date</div>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Due Date</div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Amount</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
              placeholder="يستخدم فقط إذا لم تضف trip lines"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">VAT Amount</div>
            <input
              type="number"
              value={vatAmount}
              onChange={(e) => setVatAmount(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
            />
          </div>
        </div>
      </Card>

      <Card
        title="Trip Lines"
        right={
          <Button variant="secondary" onClick={addTripLine}>
            إضافة سطر
          </Button>
        }
      >
        {tripLines.length === 0 ? (
          <div className="text-sm text-slate-500">
            لا توجد trip lines. يمكنك إنشاء الفاتورة بمبلغ يدوي فقط.
          </div>
        ) : (
          <div className="space-y-3">
            {tripLines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <div className="text-xs text-slate-500 mb-1">Trip ID</div>
                  <input
                    value={line.trip_id}
                    onChange={(e) => updateTripLine(index, { trip_id: e.target.value })}
                    className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
                    placeholder="uuid"
                  />
                </div>

                <div className="md:col-span-3">
                  <div className="text-xs text-slate-500 mb-1">Amount</div>
                  <input
                    type="number"
                    value={line.amount}
                    onChange={(e) => updateTripLine(index, { amount: e.target.value })}
                    className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-3">
                  <div className="text-xs text-slate-500 mb-1">Notes</div>
                  <input
                    value={line.notes}
                    onChange={(e) => updateTripLine(index, { notes: e.target.value })}
                    className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-1">
                  <Button variant="danger" onClick={() => removeTripLine(index)}>
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((x) => ({ ...x, open: false }))}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="إنشاء الفاتورة؟"
        description="سيتم إنشاء فاتورة جديدة بحالة DRAFT."
        tone="info"
        confirmText="إنشاء"
        cancelText="إلغاء"
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await submit();
        }}
      />
    </div>
  );
}