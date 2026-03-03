"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useT } from "@/src/i18n/useT";
import { listArPayments, submitArPayment, approveArPayment, rejectArPayment, type ArPayment } from "@/src/lib/ar.api";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("ar-EG");
}

export default function PaymentsClientPage() {
  const t = useT();
  const [rows, setRows] = useState<ArPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState<{ open: boolean; message: string; type?: "success" | "error" }>({
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
    setLoading(true);
    try {
      const res = await listArPayments();
      setRows(res.items || []);
    } catch (e: any) {
      setToast({ open: true, message: e?.message || "Failed to load payments", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cols: DataTableColumn<ArPayment>[] = useMemo(
    () => [
      {
        key: "id",
        label: "رقم",
        render: (r: ArPayment) => (
          <Link className="underline underline-offset-4" href={`/finance/ar/payments/${r.id}`}>
            {String(r.id).slice(0, 8)}
          </Link>
        ),
      },
      { key: "client", label: "العميل", render: (r: ArPayment) => r.clients?.name || r.client_id },
      { key: "date", label: "تاريخ الدفع", render: (r: ArPayment) => fmtDate(r.payment_date) },
      { key: "amount", label: "المبلغ", render: (r: ArPayment) => Number(r.amount || 0).toFixed(2) },
      { key: "method", label: "الطريقة", render: (r: ArPayment) => r.method || "—" },
      { key: "status", label: "الحالة", render: (r: ArPayment) => r.status },
      {
        key: "actions",
        label: "",
        render: (r: ArPayment) => (
          <div className="flex gap-2 justify-end">
            {r.status === "DRAFT" && (
              <Button
                className="h-9 px-3 py-2 text-sm"
                onClick={() =>
                  setConfirm({
                    open: true,
                    title: "إرسال الدفعة؟",
                    desc: "سيتم تحويل الدفعة إلى SUBMITTED.",
                    tone: "info",
                    confirmText: "إرسال",
                    action: async () => {
                      await submitArPayment(r.id);
                      setToast({ open: true, message: "تم الإرسال", type: "success" });
                      await load();
                    },
                  })
                }
              >
                إرسال
              </Button>
            )}

            {r.status === "SUBMITTED" && (
              <>
                <Button
                  className="h-9 px-3 py-2 text-sm"
                  onClick={() =>
                    setConfirm({
                      open: true,
                      title: "اعتماد الدفعة؟",
                      desc: "سيتم اعتماد الدفعة وتحويلها إلى POSTED.",
                      tone: "warning",
                      confirmText: "اعتماد",
                      action: async () => {
                        await approveArPayment(r.id);
                        setToast({ open: true, message: "تم الاعتماد", type: "success" });
                        await load();
                      },
                    })
                  }
                >
                  اعتماد
                </Button>

                <Button
                  className="h-9 px-3 py-2 text-sm"
                  variant="danger"
                  onClick={() =>
                    setConfirm({
                      open: true,
                      title: "رفض الدفعة؟",
                      desc: "سيتم رفض الدفعة (REJECTED).",
                      tone: "danger",
                      confirmText: "رفض",
                      action: async () => {
                        await rejectArPayment(r.id, "Rejected from UI");
                        setToast({ open: true, message: "تم الرفض", type: "success" });
                        await load();
                      },
                    })
                  }
                >
                  رفض
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-4">
      <PageHeader title="مدفوعات العملاء (AR)" subtitle="إنشاء/إرسال/اعتماد المدفوعات ومتابعة تخصيصها على الفواتير." />

      <DataTable
        title="المدفوعات"
        subtitle="آخر 50 دفعة"
        rows={rows}
        columns={cols}
        loading={loading}
        emptyTitle="لا توجد مدفوعات"
        emptyHint="أنشئ دفعة جديدة أو تأكد من وجود بيانات."
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