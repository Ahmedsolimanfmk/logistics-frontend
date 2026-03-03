"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useT } from "@/src/i18n/useT";
import { listArInvoices, submitArInvoice, approveArInvoice, rejectArInvoice, type ArInvoice } from "@/src/lib/ar.api";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("ar-EG");
}

export default function InvoicesClientPage() {
  const t = useT();
  const [rows, setRows] = useState<ArInvoice[]>([]);
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
      const res = await listArInvoices();
      setRows(res.items || []);
    } catch (e: any) {
      setToast({ open: true, message: e?.message || "Failed to load invoices", type: "error" });
      
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cols: DataTableColumn<ArInvoice>[] = useMemo(
    () => [
      { key: "invoice_no", label: "رقم الفاتورة", render: (r) => r.invoice_no || "—" },
      { key: "client", label: "العميل", render: (r) => r.clients?.name || r.client_id },
      { key: "issue", label: "تاريخ الإصدار", render: (r) => fmtDate(r.issue_date) },
      { key: "due", label: "الاستحقاق", render: (r) => fmtDate(r.due_date) },
      { key: "total", label: "الإجمالي", render: (r) => Number(r.total_amount || 0).toFixed(2) },
      { key: "status", label: "الحالة", render: (r) => r.status },
      {
        key: "actions",
        label: "",
        render: (r) => {
          return (
            <div className="flex gap-2 justify-end">
              {r.status === "DRAFT" && (
                <Button
                   className="h-9 px-3 py-2 text-sm"
                  onClick={() =>
                    setConfirm({
                      open: true,
                      title: "إرسال الفاتورة؟",
                      desc: `سيتم تحويل الفاتورة ${r.invoice_no} إلى SUBMITTED`,
                      tone: "info",
                      confirmText: "إرسال",
                      action: async () => {
                        await submitArInvoice(r.id);
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
                        title: "اعتماد الفاتورة؟",
                        desc: `سيتم اعتماد الفاتورة ${r.invoice_no}`,
                        tone: "warning",
                        confirmText: "اعتماد",
                        action: async () => {
                          await approveArInvoice(r.id);
                          setToast({ open: true, message: "تم الإرسال", type: "success" });
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
                        title: "رفض الفاتورة؟",
                        desc: "سيتم رفض الفاتورة (REJECTED).",
                        tone: "danger",
                        confirmText: "رفض",
                        action: async () => {
                          // TODO: لو عايز تدخل سبب الرفض من UI، نعمل Dialog input
                          await rejectArInvoice(r.id, "Rejected from UI");
                          setToast({ open: true, message: "تم الإرسال", type: "success" });
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
          );
        },
      },
    ],
    [t]
  );

  return (
    <div className="space-y-4">
      <PageHeader title="فواتير العملاء (AR)" subtitle="إنشاء/إرسال/اعتماد الفواتير وإدارة حالاتها." />

      <DataTable
        title="الفواتير"
        subtitle="آخر 50 فاتورة"
        rows={rows}
        columns={cols}
        loading={loading}
        emptyTitle="لا توجد فواتير"
        emptyHint="أنشئ فاتورة جديدة أو تأكد من وجود بيانات."
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