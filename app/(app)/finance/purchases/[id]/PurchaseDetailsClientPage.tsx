"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

import { receiptsService } from "@/src/services/receipts.service";
import type {
  InventoryReceipt,
  ReceiptBulkLine,
  ReceiptItem,
} from "@/src/types/receipts.types";

function fmtMoney(value: unknown): string {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.00";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";

  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString("ar-EG");
}

function shortId(id: unknown): string {
  const s = String(id ?? "");
  if (!s) return "—";
  if (s.length <= 18) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function receiptStatus(receipt: InventoryReceipt | null): string {
  return String(receipt?.status || "").toUpperCase();
}

function numberOrZero(v: unknown): number {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function estimateTotalFromReceipt(receipt: InventoryReceipt | null): number {
  if (!receipt) return 0;

  const itemsTotal = Array.isArray(receipt.items)
    ? receipt.items.reduce((sum, item) => {
        return sum + numberOrZero(item.unit_cost);
      }, 0)
    : 0;

  const bulkTotal = Array.isArray(receipt.bulk_lines)
    ? receipt.bulk_lines.reduce((sum, line) => {
        const explicitTotal = numberOrZero(line.total_cost);
        if (explicitTotal > 0) return sum + explicitTotal;

        const qty = numberOrZero(line.qty);
        const unitCost = numberOrZero(line.unit_cost);
        return sum + qty * unitCost;
      }, 0)
    : 0;

  return itemsTotal + bulkTotal;
}

function infoValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function InfoBox({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.72)] p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={[
          "mt-1 text-sm font-medium text-[rgb(var(--trex-fg))]",
          mono ? "font-mono" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

export default function PurchaseDetailsClientPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<
    "submit" | "post" | "cancel" | null
  >(null);

  const [receipt, setReceipt] = useState<InventoryReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  async function load() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await receiptsService.getById(id);
      setReceipt(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "فشل تحميل بيانات المشتريات";

      setError(msg);
      showToast("error", msg);
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit() {
    if (!receipt?.id) return;

    try {
      setBusyAction("submit");
      await receiptsService.submit(receipt.id);
      showToast("success", "تم إرسال عملية الشراء للمراجعة");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "فشل إرسال عملية الشراء"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePost() {
    if (!receipt?.id) return;

    try {
      setBusyAction("post");
      await receiptsService.post(receipt.id);
      showToast("success", "تم ترحيل عملية الشراء بنجاح");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "فشل ترحيل عملية الشراء"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancel() {
    if (!receipt?.id) return;

    try {
      setBusyAction("cancel");
      await receiptsService.cancel(receipt.id);
      showToast("success", "تم إلغاء عملية الشراء");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "فشل إلغاء عملية الشراء"
      );
    } finally {
      setBusyAction(null);
    }
  }

  const status = receiptStatus(receipt);
  const canSubmit = status === "DRAFT";
  const canPost = status === "SUBMITTED";
  const canCancel = status === "DRAFT" || status === "SUBMITTED";

  const serialItems = useMemo<ReceiptItem[]>(() => {
    return Array.isArray(receipt?.items) ? receipt.items : [];
  }, [receipt]);

  const bulkLines = useMemo<ReceiptBulkLine[]>(() => {
    return Array.isArray(receipt?.bulk_lines) ? receipt.bulk_lines : [];
  }, [receipt]);

  const displayedTotal = useMemo(() => {
    const apiTotal = numberOrZero(receipt?.total_amount);
    if (apiTotal > 0) return apiTotal;
    return estimateTotalFromReceipt(receipt);
  }, [receipt]);

  const mainDate = useMemo(() => {
    return receipt?.invoice_date || receipt?.created_at || null;
  }, [receipt]);

  const serialColumns: DataTableColumn<ReceiptItem>[] = [
    {
      key: "part",
      label: "الصنف",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-[rgb(var(--trex-fg))]">
            {row.part?.name || "—"}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {row.part?.part_number || shortId(row.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "internal_serial",
      label: "السيريال الداخلي",
      render: (row) => (
        <span className="font-mono text-xs">
          {infoValue(row.internal_serial)}
        </span>
      ),
    },
    {
      key: "manufacturer_serial",
      label: "سيريال المصنع",
      render: (row) => (
        <span className="font-mono text-xs">
          {infoValue(row.manufacturer_serial)}
        </span>
      ),
    },
    {
      key: "unit_cost",
      label: "التكلفة",
      render: (row) => fmtMoney(row.unit_cost),
    },
    {
      key: "notes",
      label: "ملاحظات",
      render: (row) => infoValue(row.notes),
    },
  ];

  const bulkColumns: DataTableColumn<ReceiptBulkLine>[] = [
    {
      key: "part",
      label: "الصنف",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-[rgb(var(--trex-fg))]">
            {row.part?.name || "—"}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {row.part?.part_number || shortId(row.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "qty",
      label: "الكمية",
      render: (row) => String(numberOrZero(row.qty)),
    },
    {
      key: "unit_cost",
      label: "تكلفة الوحدة",
      render: (row) => fmtMoney(row.unit_cost),
    },
    {
      key: "total_cost",
      label: "الإجمالي",
      render: (row) => {
        const explicitTotal = numberOrZero(row.total_cost);
        if (explicitTotal > 0) return fmtMoney(explicitTotal);

        return fmtMoney(numberOrZero(row.qty) * numberOrZero(row.unit_cost));
      },
    },
    {
      key: "notes",
      label: "ملاحظات",
      render: (row) => infoValue(row.notes),
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-sm text-slate-500">جار التحميل...</div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-sm text-red-600">⚠️ {error}</div>
        </Card>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-sm text-slate-500">لا يوجد بيانات</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <PageHeader
        title="تفاصيل المشتريات"
        subtitle={`ID: ${receipt.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canSubmit ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSubmit}
                isLoading={busyAction === "submit"}
              >
                إرسال للمراجعة
              </Button>
            ) : null}

            {canPost ? (
              <Button
                type="button"
                variant="primary"
                onClick={handlePost}
                isLoading={busyAction === "post"}
              >
                ترحيل
              </Button>
            ) : null}

            {canCancel ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleCancel}
                isLoading={busyAction === "cancel"}
              >
                إلغاء
              </Button>
            ) : null}

            <Link href="/finance/purchases">
              <Button type="button" variant="secondary">
                رجوع
              </Button>
            </Link>
          </div>
        }
      />

      <Card title="بيانات الإضافة المخزنية">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InfoBox label="المخزن" value={receipt.warehouse?.name || "—"} />

         <InfoBox
  label="المورد"
  value={receipt.vendor?.name || "—"}
/>

          <InfoBox label="رقم الفاتورة" value={receipt.invoice_no || "—"} />

          <InfoBox label="التاريخ" value={fmtDate(mainDate)} />

          <InfoBox label="الإجمالي" value={fmtMoney(displayedTotal)} />

          <InfoBox
            label="الحالة"
            value={<StatusBadge status={receipt.status || "DRAFT"} />}
          />

          <InfoBox label="عدد السيريالات" value={serialItems.length} />

          <InfoBox label="عدد البنود المجمعة" value={bulkLines.length} />

          <InfoBox label="تاريخ الإنشاء" value={fmtDate(receipt.created_at)} />

          <InfoBox label="معرّف العملية" value={shortId(receipt.id)} mono />
        </div>
      </Card>

      {serialItems.length > 0 ? (
        <DataTable<ReceiptItem>
          title="الأصناف المسلسلة"
          columns={serialColumns}
          rows={serialItems}
          loading={false}
          emptyTitle="لا توجد أصناف"
          emptyHint=""
        />
      ) : null}

      {bulkLines.length > 0 ? (
        <DataTable<ReceiptBulkLine>
          title="الأصناف المجمعة"
          columns={bulkColumns}
          rows={bulkLines}
          loading={false}
          emptyTitle="لا توجد بنود مجمعة"
          emptyHint=""
        />
      ) : null}

      {serialItems.length === 0 && bulkLines.length === 0 ? (
        <Card>
          <div className="text-sm text-slate-500">
            لا توجد أصناف داخل هذه العملية
          </div>
        </Card>
      ) : null}

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}